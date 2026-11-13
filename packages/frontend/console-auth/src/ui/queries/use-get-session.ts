import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { UseExternalQueryOptions } from "@frontend/query/react";
import { ConsoleAuthController } from "../../domain/controllers";
import { Session } from "../../common";
import { consoleAuthQueryKeys } from "./console-auth.queries";

/**
 * Gets whether a user is signed in, and their email.
 * @param options The query options.
 * @returns The query result with the session.
 */
export function useGetSession(options?: UseExternalQueryOptions<Session, Error>): UseQueryResult<Session> {
    return useQuery({
        queryKey: consoleAuthQueryKeys.session(),
        queryFn: () => getInstance(ConsoleAuthController).getSession(),
        ...options,
    });
}
