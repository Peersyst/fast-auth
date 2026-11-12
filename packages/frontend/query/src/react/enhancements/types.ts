import { Unite } from "@swisstype/essential";
import { QueryKey, UseQueryOptions, QueryFunction, UseInfiniteQueryOptions } from "@tanstack/react-query";

export type QueryPluginKey = QueryKey;

export type QueryPluginFn = (...args: any[]) => any;

export type QueryPluginOptions = Omit<UseQueryOptions<any, any, any, any>, "queryKey" | "queryFn">;

export type QueryPluginResult<TQueryFnData = any, TQueryKey extends QueryKey = any, TOptions = object, TPageParam = any> = [
    queryKey: TQueryKey,
    queryFn: QueryFunction<TQueryFnData, TQueryKey, TPageParam>,
    options: TOptions,
];

export type UseQueryPlugin<TQueryFnData, TQueryKey extends QueryKey, TOptions extends object, TPageParam = never> = (
    queryKey: TQueryKey,
    queryFn: QueryFunction<TQueryFnData, TQueryKey>,
    options: TOptions,
) => QueryPluginResult<TQueryFnData, TQueryKey, TOptions, TPageParam>;

export type UseEnhancedQueryBaseOptions<
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryKey" | "queryFn">;

export type UseEnhancedQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey extends QueryKey,
    TPlugins extends UseQueryPlugin<TQueryFnData, TQueryKey, any>[],
> = UseEnhancedQueryBaseOptions<TQueryFnData, TError, TData, TQueryKey> & {
    plugins?: TPlugins;
} & Unite<Parameters<TPlugins[number]>[2]>;

export type UseEnhancedInfiniteQueryBaseOptions<
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
> = Omit<UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, "queryKey" | "queryFn">;

export type UseEnhancedInfiniteQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey extends QueryKey,
    TPageParam,
    TPlugins extends UseQueryPlugin<TQueryFnData, TQueryKey, any>[],
> = UseEnhancedInfiniteQueryBaseOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam> & {
    plugins?: TPlugins;
} & Unite<Parameters<TPlugins[number]>[2]>;
