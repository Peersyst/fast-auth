import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalQueryOptions } from "@frontend/query/react";
import { OwnerDappDto } from "@shared/console";
import { ConsoleDappController } from "../../domain/controllers";
import { consoleDappQueryKeys } from "./console-dapp.queries";

/**
 * Gets the signed-in user's dApp.
 * @param options The query options.
 * @returns The query result with the dApp, or `null` when they have none.
 */
export function useGetMyDapp(options?: UseExternalQueryOptions<OwnerDappDto | null, Error>): UseQueryResult<OwnerDappDto | null> {
    return useQuery({
        queryKey: consoleDappQueryKeys.myDapp(),
        queryFn: () => getInstance(ConsoleDappController).getMyDapp(),
        ...options,
    });
}
