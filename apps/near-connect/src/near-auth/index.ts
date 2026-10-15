import { transactions as nearApiTransactions, utils as nearApiUtils } from "near-api-js";

import { toNearApiJsAction } from "../utils/action";
import type {
    Network,
    SignAndSendTransactionParams,
    SignAndSendTransactionsParams,
    SignInAndSignMessageParams,
    SignInParams,
    SignMessageParams,
    SignedMessage,
    TransactionRequest,
} from "../utils/types";

import { authorize, decodeJwt } from "./auth0";
import { getConfig, getDerivationPath, isNearAuthAvailable, requireDapp } from "./config";
import * as near from "./near";
import { relaySignature } from "./relayer";
import { pickAccount } from "./ui";

interface Session {
    sub: string;
    accountId: string;
    publicKey: string;
}

const SIGN_IN_SCOPE = "openid";
const SIGNING_SCOPE = "openid transaction:sign";

const sessionKey = (network: Network) => `session:${network}`;

const loadSession = async (network: Network): Promise<Session | null> => {
    const raw = await window.selector.storage.get(sessionKey(network));
    return raw ? JSON.parse(raw) : null;
};

const saveSession = async (network: Network, session: Session) => {
    await window.selector.storage.set(sessionKey(network), JSON.stringify(session));
};

const requireSession = async (network: Network, signerId?: string): Promise<Session> => {
    requireDapp(network);
    const session = await loadSession(network);
    if (!session) throw new Error("NEAR Auth is not signed in");
    if (signerId && signerId !== session.accountId) throw new Error(`NEAR Auth is not signed in as ${signerId}`);
    return session;
};

const resolveAccountId = async (network: Network, publicKey: string): Promise<string> => {
    const accountIds = await near.findAccountIds(network, publicKey);
    if (accountIds.length === 1) return accountIds[0];
    if (accountIds.length > 1) return await pickAccount(accountIds);
    return near.implicitAccountId(publicKey);
};

const connectSession = async ({ network, addFunctionCallKey }: SignInParams): Promise<Session> => {
    if (addFunctionCallKey) throw new Error("NEAR Auth cannot add a function call access key during sign in");

    const { auth0Domain, auth0ClientId } = getConfig(network);
    const tokens = await authorize(auth0Domain, auth0ClientId, {
        scope: SIGN_IN_SCOPE,
        popupBlockedPrompt: { title: "Sign in with NEAR Auth", button: "Continue" },
        prompt: "login",
    });

    const { sub } = decodeJwt<{ sub: string }>(tokens.idToken);
    const publicKey = await near.derivePublicKey(network, getDerivationPath(auth0Domain, sub));
    return { sub, accountId: await resolveAccountId(network, publicKey), publicKey };
};

const approveAndSign = async (network: Network, session: Session, kind: "transaction" | "message", payload: Uint8Array) => {
    const config = getConfig(network);
    const encoded = Array.from(payload).join(",");

    const tokens = await authorize(config.auth0Domain, config.auth0ClientId, {
        audience: config.signingAudience,
        scope: SIGNING_SCOPE,
        extraParams: { [kind === "message" ? "nep413" : "transaction"]: encoded },
        popupBlockedPrompt: { title: `Approve this ${kind}`, button: "Review in NEAR Auth" },
    });

    const { fatxn, sub } = decodeJwt<{ fatxn?: number[]; sub?: string }>(tokens.accessToken);
    if (!Array.isArray(fatxn)) throw new Error("NEAR Auth returned no approved payload");
    if (sub !== session.sub) throw new Error("NEAR Auth approved as a different account. Sign out and sign in again.");

    if (fatxn.join(",") !== encoded) throw new Error(`NEAR Auth approved a different ${kind}`);

    return await relaySignature(network, tokens.accessToken, fatxn, session.publicKey);
};

const signMessageAs = async (network: Network, session: Session, payload: Uint8Array): Promise<SignedMessage> => {
    const signature = await approveAndSign(network, session, "message", payload);
    return { accountId: session.accountId, publicKey: session.publicKey, signature: Buffer.from(signature).toString("base64") };
};

const signAndSend = async (network: Network, session: Session, transaction: nearApiTransactions.Transaction) => {
    const signature = await approveAndSign(network, session, "transaction", transaction.encode());

    const signedTransaction = new nearApiTransactions.SignedTransaction({
        transaction,
        signature: new nearApiTransactions.Signature({
            keyType: nearApiUtils.key_pair.KeyType.ED25519,
            data: signature,
        }),
    });

    return await near.broadcast(network, signedTransaction);
};

const buildTransactions = async (
    network: Network,
    session: Session,
    requests: TransactionRequest[],
): Promise<nearApiTransactions.Transaction[]> => {
    const transactions: nearApiTransactions.Transaction[] = [];

    // Numbered locally because the access key's nonce only moves once the first transaction lands.
    let nonce: bigint | undefined;

    for (const { receiverId, actions } of requests) {
        const transaction = await near.buildTransaction(network, {
            signerId: session.accountId,
            publicKey: session.publicKey,
            receiverId,
            actions: actions.map(toNearApiJsAction),
            nonce,
        });

        nonce = transaction.nonce + 1n;
        transactions.push(transaction);
    }

    return transactions;
};

const NearAuthWallet = {
    async signIn(params: SignInParams) {
        const session = await connectSession(params);
        await saveSession(params.network, session);
        return [{ accountId: session.accountId, publicKey: session.publicKey }];
    },

    async signInAndSignMessage({ messageParams, ...params }: SignInAndSignMessageParams) {
        const payload = near.encodeSignMessagePayload(messageParams);
        const session = await connectSession(params);
        const signedMessage = await signMessageAs(params.network, session, payload);

        // Saved only once the message is signed, so a failed signature leaves the dapp signed out.
        await saveSession(params.network, session);
        return [{ accountId: session.accountId, publicKey: session.publicKey, signedMessage }];
    },

    async signMessage({ network, signerId, ...messageParams }: SignMessageParams): Promise<SignedMessage> {
        const session = await requireSession(network, signerId);
        return await signMessageAs(network, session, near.encodeSignMessagePayload(messageParams));
    },

    async signOut({ network }: { network: Network }) {
        await window.selector.storage.remove(sessionKey(network));
    },

    async getAccounts({ network }: { network: Network }) {
        if (!isNearAuthAvailable(network)) return [];

        const session = await loadSession(network);
        if (!session) return [];
        return [{ accountId: session.accountId, publicKey: session.publicKey }];
    },

    async signAndSendTransaction({ receiverId, actions, ...params }: SignAndSendTransactionParams) {
        const [outcome] = await NearAuthWallet.signAndSendTransactions({ ...params, transactions: [{ receiverId, actions }] });
        return outcome;
    },

    async signAndSendTransactions({ network, signerId, transactions }: SignAndSendTransactionsParams) {
        const session = await requireSession(network, signerId);
        // All built first, so an oversized transaction fails before the first approval popup.
        const built = await buildTransactions(network, session, transactions);

        const outcomes = [];
        for (const transaction of built) {
            const outcome = await signAndSend(network, session, transaction);
            if (typeof outcome.status === "object" && outcome.status.Failure) {
                throw new Error(
                    `NEAR Auth transaction ${outcome.transaction_outcome.id} failed: ${JSON.stringify(outcome.status.Failure)}`,
                );
            }
            outcomes.push(outcome);
        }

        return outcomes;
    },
};

window.selector.ready(NearAuthWallet);
