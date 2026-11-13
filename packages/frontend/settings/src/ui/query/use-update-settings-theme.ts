import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { SettingsController } from "../../domain/controllers";
import { Theme } from "../../common";
import { UseExternalMutationOptions } from "@frontend/query/react";

/**
 * Mutation to update the user's theme setting.
 * @param options The options for the mutation.
 * @returns The mutation result.
 */
export function useUpdateSettingsTheme(
    options: UseExternalMutationOptions<void, Error, Theme> = {},
): UseMutationResult<void, Error, Theme> {
    return useMutation({
        mutationFn: (theme: Theme) => getInstance(SettingsController).setTheme(theme),
        ...options,
    });
}
