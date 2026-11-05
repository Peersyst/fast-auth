import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalQueryOptions } from "@frontend/query/react";
import { MeDto } from "@shared/console";
import { ConsoleAuthController } from "../../domain/controllers";
import { consoleAuthQueryKeys } from "./console-auth.queries";

/**
 * Gets the signed-in user as the console sees them.
 * @param options The query options.
 * @returns The query result with the user's email, role and email verification.
 */
export function useGetMe(options?: UseExternalQueryOptions<MeDto, Error>): UseQueryResult<MeDto> {
    return useQuery({
        queryKey: consoleAuthQueryKeys.me(),
        queryFn: () => getInstance(ConsoleAuthController).getMe(),
        ...options,
    });
}
