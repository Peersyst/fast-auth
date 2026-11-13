import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { DappDto } from "@shared/console";
import { ConsoleAdminController } from "../../domain/controllers";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Approves a pending dApp, then reloads the dApps, as the list and the dApp both change.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useApproveDapp({ onSuccess, ...restOptions }: UseExternalMutationOptions<DappDto, Error, string> = {}): UseMutationResult<
    DappDto,
    Error,
    string
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => getInstance(ConsoleAdminController).approveDapp(id),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: consoleAdminQueryKeys.dapps() });
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
