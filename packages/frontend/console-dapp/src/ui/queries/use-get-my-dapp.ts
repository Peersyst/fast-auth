import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalQueryOptions } from "@frontend/query/react";
import { DappDto } from "@shared/console";
import { ConsoleDappController } from "../../domain/controllers";
import { consoleDappQueryKeys } from "./console-dapp.queries";

/**
 * Gets the signed-in user's dApp.
 * @param options The query options.
 * @returns The query result with the dApp, or `null` when they have none.
 */
export function useGetMyDapp(options?: UseExternalQueryOptions<DappDto | null, Error>): UseQueryResult<DappDto | null> {
    return useQuery({
        queryKey: consoleDappQueryKeys.myDapp(),
        queryFn: () => getInstance(ConsoleDappController).getMyDapp(),
        ...options,
    });
}
