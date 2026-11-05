import { useMutation, useQueryClient, UseMutationResult, MutationFunctionContext } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { SettingsController } from "../../domain/controllers";
import { Settings } from "../../common";
import { settingsQueryKeys } from "./settings.queries";
import { UseExternalMutationOptions } from "@frontend/query/react";

/**
 * Mutation to set user settings.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useUpdateSettings({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<void, Error, Partial<Settings>> = {}): UseMutationResult<void, Error, Partial<Settings>> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (settings: Partial<Settings>) => getInstance(SettingsController).setSettings(settings),
        onSuccess: (data: void, variables: Partial<Settings>, onMutateResult: unknown, context: MutationFunctionContext) => {
            queryClient.invalidateQueries({ queryKey: settingsQueryKeys.lists() });
            onSuccess?.(data, variables, onMutateResult, context);
        },
        ...restOptions,
    });
}
