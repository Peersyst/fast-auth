import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalQueryOptions } from "@frontend/query/react";
import { DappEventDto } from "@shared/console";
import { ConsoleAdminController } from "../../domain/controllers";
import { consoleAdminQueryKeys } from "./console-admin.queries";

/**
 * Lists a dApp's activity, newest first.
 * @param id The dApp's id.
 * @param options The query options.
 * @returns The query result with the events.
 */
export function useGetDappEvents(id: string, options?: UseExternalQueryOptions<DappEventDto[], Error>): UseQueryResult<DappEventDto[]> {
    return useQuery({
        queryKey: consoleAdminQueryKeys.events(id),
        queryFn: () => getInstance(ConsoleAdminController).getDappEvents(id),
        ...options,
    });
}
