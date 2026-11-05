import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { OwnerDappDto } from "@shared/console";
import { WithdrawChangeParams } from "../interfaces";
import { ConsoleDappController } from "../../domain/controllers";
import { consoleDappQueryKeys } from "./console-dapp.queries";

/**
 * Withdraws an approved dApp's change under review, then shows the dApp without it.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useWithdrawChange({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<OwnerDappDto, Error, WithdrawChangeParams> = {}): UseMutationResult<
    OwnerDappDto,
    Error,
    WithdrawChangeParams
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: WithdrawChangeParams) => getInstance(ConsoleDappController).withdrawChange(variables),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.setQueryData(consoleDappQueryKeys.myDapp(), data);
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
