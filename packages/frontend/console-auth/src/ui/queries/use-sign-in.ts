import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { ConsoleAuthController } from "../../domain/controllers";
import { consoleAuthQueryKeys } from "./console-auth.queries";

/**
 * Signs in through the Auth0 popup, then reloads the session.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useSignIn({ onSuccess, ...restOptions }: UseExternalMutationOptions<void, Error, void> = {}): UseMutationResult<
    void,
    Error,
    void
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => getInstance(ConsoleAuthController).signIn(),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: consoleAuthQueryKeys.all });
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
