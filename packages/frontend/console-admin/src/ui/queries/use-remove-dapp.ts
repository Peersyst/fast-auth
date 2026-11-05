import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { AdminDappDto } from "@shared/console";
import { ConsoleAdminController } from "../../domain/controllers";
import { DappReasonActionParams } from "../interfaces";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Removes a dApp, then reloads the dApps, as the list, the dApp and its activity all change.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useRemoveDapp({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<AdminDappDto, Error, DappReasonActionParams> = {}): UseMutationResult<
    AdminDappDto,
    Error,
    DappReasonActionParams
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: DappReasonActionParams) => getInstance(ConsoleAdminController).removeDapp(params),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: consoleAdminQueryKeys.dapps() });
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
