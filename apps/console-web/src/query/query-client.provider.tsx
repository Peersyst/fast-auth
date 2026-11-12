import { PropsWithChildren } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider as QueryClientProviderRoot } from "@tanstack/react-query";
import { isDomainError } from "@frontend/core/domain/error";
import { BrowserErrorEvent } from "@frontend/core/ui/error/browser";

const MAX_FAILURES = 3;

/**
 * Receives an error and dispatches a UIErrorEvent.
 * @param error The error to handle.
 */
function handleQueryClientError(error: Error): void {
    if (isDomainError(error)) BrowserErrorEvent.dispatch(error.message, error.severity, error.data);
    else BrowserErrorEvent.dispatch(error.message);
}

/**
 * Creates the app's query client. A mapped domain error is an answer, so only other failures are retried.
 * @returns The query client.
 */
export function createQueryClient(): QueryClient {
    return new QueryClient({
        queryCache: new QueryCache({ onError: handleQueryClientError }),
        mutationCache: new MutationCache({ onError: handleQueryClientError }),
        defaultOptions: {
            queries: {
                retry: (failureCount, error) => !isDomainError(error) && failureCount < MAX_FAILURES,
            },
        },
    });
}

const queryClient = createQueryClient();

export function QueryClientProvider({ children }: PropsWithChildren): React.JSX.Element {
    return <QueryClientProviderRoot client={queryClient}>{children}</QueryClientProviderRoot>;
}
