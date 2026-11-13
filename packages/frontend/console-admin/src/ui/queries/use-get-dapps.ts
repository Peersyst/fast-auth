import { keepPreviousData, useQuery, UseQueryResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalQueryOptions } from "@frontend/query/react";
import { PaginatedDappsDto } from "@shared/console";
import { ConsoleAdminController } from "../../domain/controllers";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Lists every dApp a page at a time, keeping the shown page while the next one loads.
 * @param page The page.
 * @param options The query options.
 * @returns The query result with the page.
 */
export function useGetDapps(page: number, options?: UseExternalQueryOptions<PaginatedDappsDto, Error>): UseQueryResult<PaginatedDappsDto> {
    return useQuery({
        queryKey: consoleAdminQueryKeys.list(page),
        queryFn: () => getInstance(ConsoleAdminController).listDapps(page),
        placeholderData: keepPreviousData,
        ...options,
    });
}
