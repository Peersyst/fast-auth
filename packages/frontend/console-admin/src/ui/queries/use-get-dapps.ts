import { keepPreviousData, useQuery, UseQueryResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalQueryOptions } from "@frontend/query/react";
import { PaginatedDappsDto } from "@shared/console";
import { ConsoleAdminController } from "../../domain/controllers";
import { ListDappsParams } from "../interfaces";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Lists the dApps a filter matches, keeping the shown page while the next one loads.
 * @param params The filter, sort and page.
 * @param options The query options.
 * @returns The query result with the page.
 */
export function useGetDapps(
    params: ListDappsParams,
    options?: UseExternalQueryOptions<PaginatedDappsDto, Error>,
): UseQueryResult<PaginatedDappsDto> {
    return useQuery({
        queryKey: consoleAdminQueryKeys.list(params),
        queryFn: () => getInstance(ConsoleAdminController).listDapps(params),
        placeholderData: keepPreviousData,
        ...options,
    });
}
