import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { RemoveDappParams } from "../interfaces";
import { ConsoleDappController } from "../../domain/controllers";
import { consoleDappQueryKeys } from "./console-dapp.queries";

/**
 * Removes the owner's dApp, then shows that they have none.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useRemoveDapp({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<void, Error, RemoveDappParams> = {}): UseMutationResult<void, Error, RemoveDappParams> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: RemoveDappParams) => getInstance(ConsoleDappController).removeDapp(variables),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.setQueryData(consoleDappQueryKeys.myDapp(), null);
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
