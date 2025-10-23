import { TypedError } from "near-api-js/lib/providers";
import { isRateLimitError } from "../utils/is-rate-limit-error";
import { NearRPCErrors } from "../error/near-rpc.errors";
import { NearRPCConnectionManager } from "../near-rpc-connection-manager";

/**
 * Decorator to try to handle rate limit errors. Even if this decorator manages the rate limit errors,
 * in case of extreme abuse it is still possible to receive a rate limit error.
 * @returns A decorator function.
 */
export function NearRPCRateLimit() {
    return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const _this = this as { connectionManager: NearRPCConnectionManager };

            if (!_this.connectionManager) {
                throw new Error(`NearRPCConnectionManager not found in ${_this.constructor.name}`);
            }

            const { retries } = _this.connectionManager.connectionConfig;
            for (let retryCount = 0; retryCount <= retries; retryCount++) {
                try {
                    try {
                        return await originalMethod.apply(this, args);
                    } catch {
                        // First we switch the RPC in order to avoid other requests to retrying on the same RPC.
                        _this.connectionManager.switchToNextRPC();
                        // Enable others to perform requests.
                        await new Promise((resolve) => setTimeout(resolve));
                        // Optimistic retry before managing the error and the rate limit.
                        return await originalMethod.apply(this, args);
                    }
                } catch (error) {
                    if (isRateLimitError(error)) {
                        // We can not retry anymore
                        if (retryCount === retries) {
                            throw new TypedError("Rate limit exceeded", NearRPCErrors.RATE_LIMIT_EXCEEDED);
                        }
                        // Will wait before retrying and maybe switch to another RPC
                        await _this.connectionManager.handleRateLimitError(retryCount);
                    } else {
                        throw error;
                    }
                }
            }
        };

        return descriptor;
    };
}
