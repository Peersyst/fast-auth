import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FinalExecutionOutcome, JsonRpcProvider } from "near-api-js/lib/providers";
import { AccessKeyView, QueryResponseKind } from "near-api-js/lib/providers/provider";
import { SignedTransaction } from "near-api-js/lib/transaction";
import { INearRPCConnectionManager, NearRPCConnectionManager } from "@shared/near/rpc";

@Injectable()
export class NearClientService {
    private readonly connectionManager: INearRPCConnectionManager;

    private readonly recentBlockHashTimeout: number;
    private recentBlockHash: string | undefined = undefined;
    private lastRecentBlockHashTime: number = 0;

    constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
        this.connectionManager = new NearRPCConnectionManager({
            nodeUrls: this.configService.get("near.rpcNodeUrls") as string[],
            wait: this.configService.get("near.rpcWait") as number,
            retries: this.configService.get("near.rpcRetries") as number,
            backoff: this.configService.get("near.rpcBackoff") as number,
        });

        this.recentBlockHashTimeout = this.configService.get("near.recentBlockHashTimeout") as number;
    }

    private get provider(): JsonRpcProvider {
        return this.connectionManager.getProvider();
    }

    /**
     * Checks if the recent block hash is outdated.
     * @returns True if the recent block hash is outdated, false otherwise.
     */
    private isRecentBlockHashOutdated(): boolean {
        return !this.recentBlockHash || this.lastRecentBlockHashTime + this.recentBlockHashTimeout <= Date.now();
    }

    /**
     * Updates the recent block hash.
     * @param blockHash The block hash to update.
     */
    private updateRecentBlockHash(blockHash: string): void {
        this.recentBlockHash = blockHash;
        this.lastRecentBlockHashTime = Date.now();
    }

    /**
     * Wrapper from near-api-js provider.query.
     * Updates the recent block hash if it is older than the timeout.
     * @param args The arguments to pass to the query.
     * @returns The result of the query.
     */
    private async query<T extends QueryResponseKind>(...args: any[]): Promise<T> {
        const res = await this.provider.query<T>(...args);

        if (this.isRecentBlockHashOutdated()) {
            this.updateRecentBlockHash(res.block_hash);
        }

        return res;
    }

    /**
     * Queries the access key of an account.
     * @param accountId The account id.
     * @param publicKey The public key.
     * @returns The access key.
     */
    // @NearRPCRateLimit()
    async queryAccessKey(accountId: string, publicKey: string): Promise<AccessKeyView> {
        return this.query<AccessKeyView>({
            request_type: "view_access_key",
            finality: "final",
            account_id: accountId,
            public_key: publicKey,
        });
    }

    /**
     * Sends a transaction to the network.
     * @param signedTransaction The signed transaction to send.
     * @returns The result of the transaction.
     */
    // @NearRPCRateLimit()
    async sendTransaction(signedTransaction: SignedTransaction): Promise<FinalExecutionOutcome> {
        return this.provider.sendTransactionUntil(signedTransaction, "EXECUTED_OPTIMISTIC");
    }

    /**
     * Gets a recent block hash.
     * @returns The recent block hash.
     */
    // @NearRPCRateLimit()
    async getRecentBlockHash(): Promise<string> {
        if (this.isRecentBlockHashOutdated()) {
            const response = await this.provider.block({
                finality: "final",
            });

            this.updateRecentBlockHash(response.header.hash);
        }

        return this.recentBlockHash!;
    }
}
