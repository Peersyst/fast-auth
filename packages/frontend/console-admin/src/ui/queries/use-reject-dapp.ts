import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { AdminDappDto } from "@shared/console";
import { ConsoleAdminController } from "../../domain/controllers";
import { DappActionParams } from "../interfaces";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Rejects a pending dApp, then reloads the dApps, as the list, the dApp and its activity all change.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useRejectDapp({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<AdminDappDto, Error, DappActionParams> = {}): UseMutationResult<AdminDappDto, Error, DappActionParams> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: DappActionParams) => getInstance(ConsoleAdminController).rejectDapp(params),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: consoleAdminQueryKeys.dapps() });
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
