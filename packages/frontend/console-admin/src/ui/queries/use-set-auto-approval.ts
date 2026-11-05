import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalMutationOptions } from "@frontend/query/react";
import { SettingsDto } from "@shared/console";
import { ConsoleAdminController } from "../../domain/controllers";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Turns auto-approval on or off, then shows the settings the console answered with.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useSetAutoApproval({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<SettingsDto, Error, boolean> = {}): UseMutationResult<SettingsDto, Error, boolean> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (enabled: boolean) => getInstance(ConsoleAdminController).setAutoApproval(enabled),
        ...restOptions,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.setQueryData(consoleAdminQueryKeys.settings(), data);
            onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
