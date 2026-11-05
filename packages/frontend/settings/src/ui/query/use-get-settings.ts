import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Settings } from "../../common";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { SettingsController } from "../../domain/controllers";
import { UseExternalQueryOptions } from "@frontend/query/react";
import { settingsQueryKeys } from "./settings.queries";

/**
 * Gets the settings.
 * @param options The query options.
 * @returns The query result with the settings.
 */
export function useGetSettings<TData = Settings | undefined>(
    options?: UseExternalQueryOptions<Settings | undefined, Error, TData>,
): UseQueryResult<TData> {
    const queryKey = settingsQueryKeys.lists();

    return useQuery({
        queryKey,
        queryFn: () => getInstance(SettingsController).getSettings(),
        ...options,
    });
}
