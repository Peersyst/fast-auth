import { delay } from "./delay";

/**
 * Executes a function with retries.
 * @param fn The function to execute.
 * @param maxRetries The maximum number of retries.
 * @param timeout The timeout between retries.
 * @param onRetry The function to call on retry.
 * @returns The result of the function.
 */
export async function withRetries<T>(
    fn: () => T,
    maxRetries: number,
    timeout: number,
    onRetry?: (error: any) => void,
): Promise<Awaited<T>> {
    let retries = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await Promise.resolve(fn());
        } catch (error) {
            if (retries >= maxRetries) {
                throw error;
            }
            onRetry?.(error);
            retries++;
            await delay(timeout);
        }
    }
}
