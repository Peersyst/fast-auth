import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { ConsoleAuthController } from "../../domain/controllers";

/**
 * Signs out of Auth0, leaving the app.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useSignOut(options?: UseExternalMutationOptions<void, Error, void>): UseMutationResult<void, Error, void> {
    return useMutation({
        mutationFn: () => getInstance(ConsoleAuthController).signOut(),
        ...options,
    });
}
