import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalQueryOptions } from "@frontend/query/react";
import { SettingsDto } from "@shared/console";
import { ConsoleAdminController } from "../../domain/controllers";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Gets the console's settings.
 * @param options The query options.
 * @returns The query result with the settings.
 */
export function useGetSettings(options?: UseExternalQueryOptions<SettingsDto, Error>): UseQueryResult<SettingsDto> {
    return useQuery({
        queryKey: consoleAdminQueryKeys.settings(),
        queryFn: () => getInstance(ConsoleAdminController).getSettings(),
        ...options,
    });
}
