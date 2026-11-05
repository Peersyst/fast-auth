import { InfiniteData, QueryFunction, QueryKey, UseInfiniteQueryResult, useInfiniteQuery } from "@tanstack/react-query";
import { UseQueryPlugin, UseEnhancedInfiniteQueryOptions } from "./types";

/**
 * An enhanced version of `useInfiniteQuery` that allows plugins.
 * @param options The use enhanced infinite query options.
 * @returns A `useInfiniteQuery` result.
 */
export function useEnhancedInfiniteQuery<
    TQueryFnData = unknown,
    TError = unknown,
    TData = InfiniteData<TQueryFnData>,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
    TPlugins extends UseQueryPlugin<TQueryFnData, TQueryKey, any, TPageParam>[] = UseQueryPlugin<
        TQueryFnData,
        TQueryKey,
        Record<string, any>,
        TPageParam
    >[],
>(
    options: UseEnhancedInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam, TPlugins> & {
        queryKey: TQueryKey;
        queryFn: QueryFunction<TQueryFnData, TQueryKey, TPageParam>;
    },
): UseInfiniteQueryResult<TData, TError> {
    const { queryKey, queryFn, plugins = [] as unknown as TPlugins, ...restOptions } = options;

    const [finalQueryKey, finalQueryFn, finalOptions] = plugins.reduce(
        ([qk, qfn, opts], plugin) => plugin(qk, qfn, opts),
        [queryKey, queryFn, restOptions],
    );

    return useInfiniteQuery<TQueryFnData, TError, TData, TQueryKey, TPageParam>({
        queryKey: finalQueryKey,
        queryFn: finalQueryFn,
        ...finalOptions,
    });
}
