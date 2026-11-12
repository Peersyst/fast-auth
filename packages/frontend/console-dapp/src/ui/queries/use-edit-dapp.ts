import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { OwnerDappDto } from "@shared/console";
import { EditDappParams } from "../interfaces";
import { ConsoleDappController } from "../../domain/controllers";
import { consoleDappQueryKeys } from "./console-dapp.queries";

/**
 * Saves an edit of the owner's dApp, then shows the dApp the console answered with.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useEditDapp({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<OwnerDappDto, Error, EditDappParams> = {}): UseMutationResult<OwnerDappDto, Error, EditDappParams> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: EditDappParams) => getInstance(ConsoleDappController).editDapp(variables),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.setQueryData(consoleDappQueryKeys.myDapp(), data);
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
