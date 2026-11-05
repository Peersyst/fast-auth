import { useMutation, useQueryClient, UseMutationResult, MutationFunctionContext } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { SettingsController } from "../../domain/controllers";
import { Locale } from "../../common";
import { settingsQueryKeys } from "./settings.queries";
import { UseExternalMutationOptions } from "@frontend/query/react";

/**
 * Mutation to update the user's locale setting.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useUpdateSettingsLocale({
    onSuccess,
    ...restOptions
}: UseExternalMutationOptions<void, Error, Locale> = {}): UseMutationResult<void, Error, Locale> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (locale: Locale) => getInstance(SettingsController).setLocale(locale),
        onSuccess: (data: void, variables: Locale, onMutateResult: unknown, context: MutationFunctionContext) => {
            queryClient.invalidateQueries({ queryKey: settingsQueryKeys.lists() });
            onSuccess?.(data, variables, onMutateResult, context);
        },
        ...restOptions,
    });
}
