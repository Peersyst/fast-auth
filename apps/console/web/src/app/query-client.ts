import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError, type Me } from "../api/client";
import { ME_QUERY_KEY } from "../api/hooks";

function isClientError(error: unknown): boolean {
    return error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500;
}

export function createQueryClient(): QueryClient {
    const onError = (error: unknown) => {
        if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED") {
            client.setQueryData<Me>(ME_QUERY_KEY, (me) => me && { ...me, emailVerified: false });
        }
    };
    const client = new QueryClient({
        queryCache: new QueryCache({ onError }),
        mutationCache: new MutationCache({ onError }),
        defaultOptions: {
            queries: {
                retry: (failureCount, error) => !isClientError(error) && failureCount < 3,
            },
        },
    });
    return client;
}

export const queryClient = createQueryClient();
