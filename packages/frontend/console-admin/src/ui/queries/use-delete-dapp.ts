import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { ConsoleAdminController } from "../../domain/controllers";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Deletes a dApp, then forgets the list pages and the dApp's own page. Opening them again asks the console instead of
 * showing the deleted dApp from the cache.
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
        onSuccess: (data, id, onMutateResult, context) => {
            queryClient.removeQueries({ queryKey: consoleAdminQueryKeys.detail(id) });
            queryClient.removeQueries({ queryKey: consoleAdminQueryKeys.lists() });
            onSuccess?.(data, id, onMutateResult, context);
        },
    });
}
