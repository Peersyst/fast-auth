import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { ConsoleAdminController } from "../../domain/controllers";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Deletes a dApp, then reloads the list pages. Its own page is left alone, as asking for a deleted dApp only answers not found.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useDeleteDapp({ onSuccess, ...restOptions }: UseExternalMutationOptions<void, Error, string> = {}): UseMutationResult<
    void,
    Error,
    string
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => getInstance(ConsoleAdminController).deleteDapp(id),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: consoleAdminQueryKeys.lists() });
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
