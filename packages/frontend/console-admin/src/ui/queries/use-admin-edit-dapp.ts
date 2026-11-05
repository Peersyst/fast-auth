import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { AdminDappDto } from "@shared/console";
import { ConsoleAdminController } from "../../domain/controllers";
import { AdminEditDappParams } from "../interfaces";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Saves an admin's edit of a dApp, then reloads the dApps, as the list, the dApp and its activity all change.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useAdminEditDapp({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<AdminDappDto, Error, AdminEditDappParams> = {}): UseMutationResult<AdminDappDto, Error, AdminEditDappParams> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: AdminEditDappParams) => getInstance(ConsoleAdminController).editDapp(params),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: consoleAdminQueryKeys.dapps() });
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
