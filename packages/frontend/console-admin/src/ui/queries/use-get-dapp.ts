import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalQueryOptions } from "@frontend/query/react";
import { DappDto } from "@shared/console";
import { ConsoleAdminController } from "../../domain/controllers";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Gets a dApp.
 * @param id The dApp's id.
 * @param options The query options.
 * @returns The query result with the dApp.
 */
export function useGetDapp(id: string, options?: UseExternalQueryOptions<DappDto, Error>): UseQueryResult<DappDto> {
    return useQuery({
        queryKey: consoleAdminQueryKeys.detail(id),
        queryFn: () => getInstance(ConsoleAdminController).getDapp(id),
        ...options,
    });
}
