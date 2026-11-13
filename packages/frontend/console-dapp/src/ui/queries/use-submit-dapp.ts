import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { CreateDappRequest, DappDto } from "@shared/console";
import { ConsoleDappController } from "../../domain/controllers";
import { consoleDappQueryKeys } from "./console-dapp.queries";

/**
 * Submits a new dApp for review, then shows it as the user's dApp.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useSubmitDapp({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<DappDto, Error, CreateDappRequest> = {}): UseMutationResult<DappDto, Error, CreateDappRequest> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: CreateDappRequest) => getInstance(ConsoleDappController).submitDapp(variables),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.setQueryData(consoleDappQueryKeys.myDapp(), data);
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
