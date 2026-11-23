import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { ConsoleDappController } from "../../domain/controllers";
import { consoleDappQueryKeys } from "./console-dapp.queries";

/**
 * Deletes the owner's dApp, then shows that they have none. A load of the dApp still in flight is cancelled first, since its
 * answer predates the deletion and would show the dApp again.
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
        mutationFn: (id: string) => getInstance(ConsoleDappController).deleteDapp(id),
        ...restOptions,
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.cancelQueries({ queryKey: consoleDappQueryKeys.myDapp() });
            queryClient.setQueryData(consoleDappQueryKeys.myDapp(), null);
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
