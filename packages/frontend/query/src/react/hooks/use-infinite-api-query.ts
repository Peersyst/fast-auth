import { InfiniteData, QueryFunction, QueryKey, UseInfiniteQueryResult, useInfiniteQuery } from "@tanstack/react-query";
import { UseEnhancedInfiniteQueryOptions, UseQueryPlugin } from "../enhancements/types";
import { Loosen } from "@swisstype/essential";

export type InfiniteApiQueryPageParam = number | undefined;

export interface PaginatedData<TData = unknown> {
    currentPage: number;
    pages: number;
    items: TData;
}

export type UseInfiniteApiQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey extends QueryKey,
    TPlugins extends UseQueryPlugin<TQueryFnData, TQueryKey, any, InfiniteApiQueryPageParam>[],
> = Loosen<
    Pick<
        UseEnhancedInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, InfiniteApiQueryPageParam, TPlugins>,
        Exclude<keyof UseEnhancedInfiniteQueryOptions<any, any, any, any, any, any>, "getNextPageParam">
    >,
    "initialPageParam"
>;

/**
 * A version of `useInfiniteQuery` that automatically handles API pagination.
 * @param options The use enhanced infinite query options.
 * @returns A `useInfiniteQuery` result.
 */
export function useInfiniteApiQuery<
    TQueryFnData extends PaginatedData = PaginatedData,
    TError = unknown,
    TData = InfiniteData<TQueryFnData>,
    TQueryKey extends QueryKey = QueryKey,
    TPlugins extends UseQueryPlugin<TQueryFnData, TQueryKey, any, InfiniteApiQueryPageParam>[] = UseQueryPlugin<
        TQueryFnData,
        TQueryKey,
        Record<string, any>,
        InfiniteApiQueryPageParam
    >[],
>(
    options: UseInfiniteApiQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPlugins> & {
        queryKey: TQueryKey;
        queryFn: QueryFunction<TQueryFnData, TQueryKey, InfiniteApiQueryPageParam>;
    },
): UseInfiniteQueryResult<TData, TError> {
    const { queryKey, queryFn, plugins = [], ...restOptions } = options;

    const [finalQueryKey, finalQueryFn, { initialPageParam = undefined, ...finalOptions }] = plugins.reduce<
        [TQueryKey, typeof queryFn, typeof restOptions]
    >(
        (
            [qk, qfn, opts]: [TQueryKey, typeof queryFn, typeof restOptions],
            plugin: UseQueryPlugin<TQueryFnData, TQueryKey, any, InfiniteApiQueryPageParam>,
        ) => plugin(qk, qfn, opts),
        [queryKey, queryFn, restOptions],
    );

    return useInfiniteQuery<TQueryFnData, TError, TData, TQueryKey, InfiniteApiQueryPageParam>({
        queryKey: finalQueryKey,
        queryFn: finalQueryFn,
        initialPageParam,
        getNextPageParam: ({ currentPage, pages }) => (currentPage < pages ? currentPage + 1 : undefined),
        ...finalOptions,
    });
}
