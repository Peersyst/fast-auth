import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { ConsoleAuthController } from "../../domain/controllers";
import { consoleAuthQueryKeys } from "./console-auth.queries";

/**
 * Renews the session past the cache, then reloads the user so a verified email shows.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useRefreshSession({ onSuccess, ...restOptions }: UseExternalMutationOptions<void, Error, void> = {}): UseMutationResult<
    void,
    Error,
    void
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => getInstance(ConsoleAuthController).refreshSession(),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: consoleAuthQueryKeys.me() });
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
