import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";
import { UseQueryPlugin, UseEnhancedQueryOptions } from "./types";

/**
 * An enhanced version of `useQuery` that allows plugins.
 * @param options The use enhanced query options.
 * @returns A `useQuery` result.
 */
export function useEnhancedQuery<
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TPlugins extends UseQueryPlugin<TQueryFnData, TQueryKey, any>[] = UseQueryPlugin<TQueryFnData, TQueryKey, Record<string, any>>[],
>(
    options: UseEnhancedQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPlugins> & {
        queryKey: TQueryKey;
        queryFn: QueryFunction<TQueryFnData, TQueryKey>;
    },
): UseQueryResult<TData, TError> {
    const { queryKey, queryFn, plugins = [] as unknown as TPlugins, ...restOptions } = options;

    const [finalQueryKey, finalQueryFn, finalOptions] = plugins.reduce(
        ([qk, qfn, opts], plugin) => plugin(qk, qfn, opts),
        [queryKey, queryFn, restOptions],
    );

    return useQuery<TQueryFnData, TError, TData, TQueryKey>({
        queryKey: finalQueryKey,
        queryFn: finalQueryFn,
        ...finalOptions,
    });
}
