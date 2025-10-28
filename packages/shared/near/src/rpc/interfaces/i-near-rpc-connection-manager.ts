import { JsonRpcProvider } from "near-api-js/lib/providers";

export interface NearRPCConnectionBackoffConfig {
    /**
     * Number of retries before giving up on a request
     */
    retries: number;
    /**
     * Wait until next retry in milliseconds
     */
    wait: number;
    /**
     * Linear back off for waiting to retry again
     */
    backoff: number;
}

export type NearRPCConnectionManagerOptions = NearRPCConnectionBackoffConfig & {
    /**
     * The list of node URLs to connect to
     */
    nodeUrls: string[];
};

export interface INearRPCConnectionManager {
    /**
     * The configuration for the connection to the RPC provider.
     */
    connectionConfig: NearRPCConnectionManagerOptions;
    /**
     * Retrieves the current Near JsonRpcProvider instance.
     * @returns The active Near JsonRpcProvider instance.
     */
    getProvider(): JsonRpcProvider;

    /**
     * Switches to the next available RPC endpoint in the pool.
     */
    switchToNextRPC(): void;
    /**
     * Handles rate limiting by waiting and potentially switching RPC providers.
     * @param retryCount The current retry attempt number.
     */
    handleRateLimitError(retryCount: number): Promise<void>;
}
