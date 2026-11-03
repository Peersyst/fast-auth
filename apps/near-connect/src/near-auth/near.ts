import type { AccessKeyViewRaw, FinalExecutionOutcome } from "@near-js/types";
import { transactions as nearApiTransactions, utils as nearApiUtils } from "near-api-js";

import { NearRpc } from "../utils/rpc";
import type { Network, SignMessagePayload } from "../utils/types";

import { getConfig } from "./config";

const ED25519_DOMAIN_ID = 1;

const rpcs: Partial<Record<Network, NearRpc>> = {};

const getRpc = (network: Network): NearRpc => {
    const dappProviders = window.selector.providers[network] ?? [];
    return (rpcs[network] ??= new NearRpc(dappProviders.length ? dappProviders : getConfig(network).fallbackRpcUrls));
};

export const derivePublicKey = async (network: Network, path: string): Promise<string> => {
    const config = getConfig(network);
    return await getRpc(network).viewMethod<string>({
        contractId: config.mpcContractId,
        methodName: "derived_public_key",
        args: { path, predecessor: config.fastAuthContractId, domain_id: ED25519_DOMAIN_ID },
    });
};

const INDEXER_TIMEOUT_MS = 6000;
const INDEXER_ATTEMPTS = 3;
const INDEXER_RETRY_DELAY_MS = 500;

export const findAccountIds = async (network: Network, publicKey: string): Promise<string[]> => {
    const { fastNearApiBaseUrl } = getConfig(network);
    const url = `${fastNearApiBaseUrl}/public_key/${encodeURIComponent(publicKey)}`;

    for (let attempt = 1; attempt <= INDEXER_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), INDEXER_TIMEOUT_MS);
        const body = await fetch(url, { signal: controller.signal })
            .then((response) => response.json())
            .catch(() => null)
            .finally(() => clearTimeout(timer));
        if (Array.isArray(body?.account_ids)) return body.account_ids;
        if (attempt < INDEXER_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, INDEXER_RETRY_DELAY_MS * attempt));
    }

    // Never fall back to [], which would sign in as the implicit account instead of the user's.
    throw new Error("NEAR Auth could not reach the account indexer. Try again in a moment.");
};

export const implicitAccountId = (publicKey: string): string => {
    return Buffer.from(nearApiUtils.PublicKey.from(publicKey).data).toString("hex");
};

// Keeps the signing JWT, which carries the payload as decimal bytes, under the guard's 7168-byte limit.
const MAX_PAYLOAD_BYTES = 1024;

export const buildTransaction = async (
    network: Network,
    params: { signerId: string; publicKey: string; receiverId: string; actions: nearApiTransactions.Action[]; nonce?: bigint },
): Promise<nearApiTransactions.Transaction> => {
    const rpc = getRpc(network);

    const [block, nonce] = await Promise.all([
        rpc.block({ finality: "final" }),
        params.nonce ??
            rpc
                .query<AccessKeyViewRaw>({
                    request_type: "view_access_key",
                    // "final" can miss a transaction that just landed, and nonce + 1 would then reuse its nonce.
                    finality: "optimistic",
                    account_id: params.signerId,
                    public_key: params.publicKey,
                })
                .then((accessKey) => BigInt(accessKey.nonce) + 1n),
    ]);

    const transaction = nearApiTransactions.createTransaction(
        params.signerId,
        nearApiUtils.PublicKey.from(params.publicKey),
        params.receiverId,
        nonce,
        params.actions,
        nearApiUtils.serialize.base_decode(block.header.hash),
    );

    const size = transaction.encode().length;
    if (size > MAX_PAYLOAD_BYTES) throw new Error(`NEAR Auth can sign transactions up to ${MAX_PAYLOAD_BYTES} bytes, this one is ${size}`);
    return transaction;
};

export const broadcast = async (
    network: Network,
    signedTransaction: nearApiTransactions.SignedTransaction,
): Promise<FinalExecutionOutcome> => {
    const encoded = Buffer.from(signedTransaction.encode()).toString("base64");
    return await getRpc(network).sendJsonRpc<FinalExecutionOutcome>("send_tx", {
        signed_tx_base64: encoded,
        wait_until: "EXECUTED_OPTIMISTIC",
    });
};

const NEP413_TAG = 2 ** 31 + 413;

// Hand-written because near-api-js's borsh writes non-ASCII strings with the wrong bytes.
export const encodeSignMessagePayload = (payload: SignMessagePayload): Uint8Array => {
    if (!(payload.nonce instanceof Uint8Array) || payload.nonce.length !== 32) {
        throw new Error("NEAR Auth requires a 32 byte nonce to sign a message");
    }

    const parts: Uint8Array[] = [];
    const u32 = (value: number) => {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setUint32(0, value, true);
        return bytes;
    };
    const borshString = (value: string) => {
        const bytes = new TextEncoder().encode(value);
        return [u32(bytes.length), bytes];
    };

    parts.push(u32(NEP413_TAG));
    parts.push(...borshString(payload.message));
    parts.push(payload.nonce);
    parts.push(...borshString(payload.recipient));

    if (payload.callbackUrl == null) parts.push(Uint8Array.of(0));
    else parts.push(Uint8Array.of(1), ...borshString(payload.callbackUrl));

    const bytes = Uint8Array.from(parts.flatMap((part) => Array.from(part)));
    if (bytes.length > MAX_PAYLOAD_BYTES) {
        throw new Error(`NEAR Auth can sign messages up to ${MAX_PAYLOAD_BYTES} bytes, this one is ${bytes.length}`);
    }
    return bytes;
};
