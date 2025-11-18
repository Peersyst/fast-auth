import { AccessKeyInfoView, AccessKeyViewRaw, FinalExecutionOutcome } from "near-api-js/lib/providers/provider";
import { timeoutPromise, TimeoutPromiseError } from "../utils/timeout-promise";
import { Near } from "near-api-js";
import { Action, actionCreators, createTransaction, DelegateAction } from "@near-js/transactions";
import { PublicKey } from "near-api-js/lib/utils/key_pair";
import { Signature } from "near-api-js/lib/transaction";
import { base_decode } from "near-api-js/lib/utils/serialize";
import { NearSigner } from "./NearSigner";

export interface FastNearGetAccountIdsForPublicKeyResponse {
    /**
     * The list of account IDs that are associated with the given public key.
     * @example ["account.near", "account2.near"]
     */
    account_ids: string[];
    /**
     * The public key that was used to search for the account IDs.
     * @example "ed25519:..."
     */
    public_key: string;
}

export class NearProvider {
    private readonly maxRequestTimeout: number = 20_000;
    private readonly relayerSigner: NearSigner;

    constructor(
        private readonly indexerUrl: string,
        private readonly near: Near,
        relayerPrivateKey: string,
    ) {
        this.relayerSigner = new NearSigner(relayerPrivateKey);
    }

    /**
     *
     * @param accountId
     */
    private parseAccountId(accountId: string): string {
        if (accountId.endsWith(".mainnet")) {
            return accountId.replace(".mainnet", ".near");
        }
        return accountId;
    }

    /**
     *
     * @param path
     */
    private async _fetchJson<T>(path: string): Promise<T> {
        const response = await fetch(this.indexerUrl + path);

        if (!response.ok) {
            throw new Error("could not fetch json " + path);
        }
        return (await response.json()) as T;
    }

    /**
     *
     * @param path
     */
    protected async fetchJson<T>(path: string): Promise<T> {
        try {
            return await timeoutPromise(this._fetchJson<T>(path), this.maxRequestTimeout);
        } catch (e: unknown) {
            let errorMsg = "could not fetch json " + path;

            if (e instanceof TimeoutPromiseError) errorMsg = "could not fetch json due to timeout " + path;
            throw new Error(errorMsg);
        }
    }

    /**
     *
     * @param publicKey
     */
    async getAccountIdsByPublicKey(publicKey: string): Promise<string[]> {
        const accountIds = await this.fetchJson<string[]>(`/v1/kitwallet/publicKey/${publicKey}/accounts`);
        return accountIds.map(this.parseAccountId);
    }

    /**
     *
     * @param publicKey
     */
    async _getAccountIdsByPublicKey(publicKey: string): Promise<string[]> {
        const { account_ids: accountIds } = await this.fetchJson<FastNearGetAccountIdsForPublicKeyResponse>(
            `/v1/public-key/${publicKey}/accounts`,
        );
        return accountIds.map(this.parseAccountId);
    }

    /**
     *
     * @param accountId
     * @param publicKey
     */
    async getAccountNonce(accountId: string, publicKey: string): Promise<bigint> {
        const rawAccessKey = await this.near.connection.getConnection().provider.query<AccessKeyViewRaw>({
            request_type: "view_access_key",
            account_id: accountId,
            public_key: publicKey,
            finality: "optimistic",
        });
        return BigInt(rawAccessKey.nonce);
    }

    /**
     *
     */
    async getMaxBlockHeight(): Promise<bigint> {
        const status = await this.near.connection.provider.status();
        return BigInt(status.sync_info.latest_block_height + 1_000);
    }

    // @ts-ignore
    /**
     *
     * @param receiverId
     * @param delegateAction
     * @param rawSignature
     */
    async relayMetaTransaction(
        receiverId: string,
        delegateAction: DelegateAction,
        rawSignature: string,
    ): Promise<{
        hash: string;
        result: FinalExecutionOutcome;
    }> {
        const signature = new Signature({
            keyType: 0,
            data: new Uint8Array(Buffer.from(rawSignature, "hex")),
        });
        const signedDelegate = actionCreators.signedDelegate({
            delegateAction,
            signature,
        });
        return this.signAndSendTransaction(receiverId, [signedDelegate]);
    }

    /**
     * Gets a recent block hash.
     * @returns The recent block hash.
     */
    async getRecentBlockHash(): Promise<string> {
        const response = await this.near.connection.provider.block({
            finality: "final",
        });
        return response.header.hash;
    }

    /**
     * Sign and sends a transaction using a signer.
     * @param receiverId The receiver id of the transaction.
     * @param actions The actions of the transaction.
     * @returns The sign response.
     */
    private async signAndSendTransaction(
        receiverId: string,
        actions: Action[],
    ): Promise<{
        hash: string;
        result: FinalExecutionOutcome;
    }> {
        const sender = this.relayerSigner.getAddress();
        const senderPublicKey = this.relayerSigner.getPublicKey();
        const senderPublicKeyString = senderPublicKey.toString();

        // Do not use Promise.all to ensure client service updates recent hash only once
        const nonce = (await this.getAccountNonce(sender, senderPublicKeyString)) + 1n;
        const recentBlockHash = await this.getRecentBlockHash();

        const tx = createTransaction(sender, senderPublicKey, receiverId, nonce, actions, base_decode(recentBlockHash));

        const { signedTransaction, hash } = this.relayerSigner.signTransaction(tx);

        console.log(`Sending transaction ${hash}`);
        const result = await this.near.connection.provider.sendTransactionUntil(signedTransaction, "FINAL");

        console.log(`Sign to ${receiverId} done with hash ${hash}`);

        return { hash, result };
    }

    /**
     *
     * @param accountId
     * @param publicKey
     */
    async hasFullAccessKey(accountId: string, publicKey: string): Promise<boolean> {
        const account = await this.near.account(accountId);
        const accountAccessKeys = await account.getAccessKeys();
        return !!accountAccessKeys.find((accessKeyView: AccessKeyInfoView) => {
            return accessKeyView.public_key === publicKey && accessKeyView.access_key.permission === "FullAccess";
        });
    }

    /**
     *
     * @param rawPublicKey
     */
    implicitAccount(rawPublicKey: string): string {
        const publicKey = PublicKey.from(rawPublicKey);
        return Buffer.from(publicKey.data).toString("hex");
    }
}
