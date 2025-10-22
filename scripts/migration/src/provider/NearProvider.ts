import { AccessKeyInfoView, AccessKeyViewRaw } from "near-api-js/lib/providers/provider";
import { timeoutPromise, TimeoutPromiseError } from "../utils/timeout-promise";
import { Near } from "near-api-js";
import { DelegateAction } from "@near-js/transactions";
import { PublicKey } from "near-api-js/lib/utils/key_pair";

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

    constructor(
        private readonly indexerUrl: string,
        private readonly near: Near,
    ) {}

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
            console.log("text", await response.url);
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
        return rawAccessKey.nonce;
    }

    /**
     *
     */
    async getMaxBlockHeight(): Promise<bigint> {
        const status = await this.near.connection.provider.status();
        return status.sync_info.latest_block_height + 1_000;
    }

    // @ts-ignore
    /**
     *
     * @param delegateAction
     * @param signature
     */
    async relayMetaTransaction(delegateAction: DelegateAction, signature: string): Promise<void> {
        throw new Error("not implemented " + delegateAction + signature);
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
