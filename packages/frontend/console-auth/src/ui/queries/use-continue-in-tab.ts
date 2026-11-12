import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { ConsoleAuthController } from "../../domain/controllers";

/**
 * Signs in by redirecting this tab to Auth0, coming back to the given path.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useContinueInTab(options?: UseExternalMutationOptions<void, Error, string>): UseMutationResult<void, Error, string> {
    return useMutation({
        mutationFn: (variables: string) => getInstance(ConsoleAuthController).continueInTab(variables),
        ...options,
    });
}
