import { useMutation, useQueryClient, UseMutationResult, MutationFunctionContext } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { SettingsController } from "../../domain/controllers";
import { Theme } from "../../common";
import { settingsQueryKeys } from "./settings.queries";
import { UseExternalMutationOptions } from "@frontend/query/react";

/**
 * Mutation to update the user's theme setting.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useUpdateSettingsTheme({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<void, Error, Theme> = {}): UseMutationResult<void, Error, Theme> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (theme: Theme) => getInstance(SettingsController).setTheme(theme),
        onSuccess: (data: void, variables: Theme, onMutateResult: unknown, context: MutationFunctionContext) => {
            queryClient.invalidateQueries({ queryKey: settingsQueryKeys.lists() });
            onSuccess?.(data, variables, onMutateResult, context);
        },
        ...restOptions,
    });
}
