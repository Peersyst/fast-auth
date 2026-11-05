import { QueryKey, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";

export type UseExternalQueryOptions<
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryKey" | "queryFn">;

export type UseExternalMutationOptions<TData = unknown, TError = Error, TVariables = void, TContext = unknown> = Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "mutationFn"
>;

export type ExtractQueryKey<F, K extends keyof F> = F[K] extends (...args: any[]) => any ? ReturnType<F[K]> : F[K];
