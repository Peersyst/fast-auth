import { JsonRpcProvider, TypedError } from "near-api-js/lib/providers";
import { NearRPCErrors } from "./error/near-rpc.errors";
import { isValidRPCUrl } from "./utils/is-valid-rpc-url";
import { INearRPCConnectionManager, NearRPCConnectionManagerOptions } from "./interfaces/i-near-rpc-connection-manager";

/**
 * Manages the connection to the RPC.
 * It checks the health status of the RPC and switches to another one if needed.
 */
export class NearRPCConnectionManager implements INearRPCConnectionManager {
    /**
     * The list of available RPC URLs.
     */
    private readonly rpcUrlPool: string[];
    /**
     * The timestamp of the last RPC switch.
     */
    private lastSwitchTimestamp: number = 0;
    /**
     * The current RPC URL in use.
     */
    private currentRpcUrl: string;
    /**
     * The Near JsonRpcProvider instance.
     */
    private readonly provider: JsonRpcProvider;

    /**
     * The connection configuration.
     */
    readonly connectionConfig: NearRPCConnectionManagerOptions;

    constructor({ nodeUrls, ...config }: NearRPCConnectionManagerOptions) {
        if (!nodeUrls.every(isValidRPCUrl)) {
            throw new TypedError("Invalid RPC URL", NearRPCErrors.INVALID_RPC_URL);
        } else if (nodeUrls.length === 0) {
            throw new TypedError("No RPC URL provided", NearRPCErrors.NO_RPC_URL_PROVIDED);
        }
        this.connectionConfig = { ...config, nodeUrls };
        this.rpcUrlPool = [...nodeUrls];
        this.currentRpcUrl = this.rpcUrlPool[0];
        this.provider = new JsonRpcProvider({ url: this.currentRpcUrl }, { wait: 500, retries: 1, backoff: 1 });
    }

    /**
     * @inheritdoc
     */
    getProvider(): JsonRpcProvider {
        return this.provider;
    }

    /**
     * Updates the RPC URL.
     * @param newRpcUrl The new RPC URL.
     */
    private async updateRPCUrl(newRpcUrl: string): Promise<void> {
        this.currentRpcUrl = newRpcUrl;
        this.provider.connection.url = newRpcUrl;
    }

    /**
     * @inheritdoc
     */
    switchToNextRPC(): void {
        if (this.rpcUrlPool.length === 1) return;

        const currentIndex = this.rpcUrlPool.indexOf(this.currentRpcUrl);
        const nextIndex = (currentIndex + 1) % this.rpcUrlPool.length;
        const nextRpcUrl = this.rpcUrlPool[nextIndex];

        this.updateRPCUrl(nextRpcUrl);
    }

    /**
     * Determines whether the RPC should be switched based on the backoff configuration.
     * @returns A boolean indicating if the RPC should be switched.
     */
    private shouldSwitchRpc(): boolean {
        return Date.now() - this.lastSwitchTimestamp >= this.connectionConfig.wait;
    }

    /**
     * @inheritdoc
     */
    async handleRateLimitError(retryCount: number): Promise<void> {
        const { wait, backoff } = this.connectionConfig;
        const baseTime = wait * (retryCount + 1) * backoff;
        // Randomized delay
        await new Promise((resolve) => setTimeout(resolve, baseTime + Math.random() * wait));

        if (this.shouldSwitchRpc()) {
            this.switchToNextRPC();
            this.lastSwitchTimestamp = Date.now();
        }
    }
}
