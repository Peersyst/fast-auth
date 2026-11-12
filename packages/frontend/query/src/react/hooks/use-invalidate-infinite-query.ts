import { RefetchOptions, useQueryClient, InfiniteData, QueryKey } from "@tanstack/react-query";

export type InvalidateInfiniteQueryOptions = RefetchOptions & {
    exact?: boolean;
};

/**
 * Returns a function to invalidate an infinite query including only its first page.
 * @returns A function to invalidate an infinite query including only its first page.
 */
export function useInvalidateInfiniteQuery(): (queryKey: QueryKey, options?: InvalidateInfiniteQueryOptions) => Promise<void> {
    const queryClient = useQueryClient();

    return function invalidateInfiniteQuery(
        queryKey: QueryKey,
        { exact = true, ...restOptions }: InvalidateInfiniteQueryOptions = {},
    ): Promise<void> {
        // Set the query data to the first page of the query in order to avoid refetching all pages
        queryClient.setQueryData(queryKey, (prev: InfiniteData<any>) => {
            return {
                pages: prev.pages?.slice(0, 1),
                pageParams: prev.pageParams?.slice(0, 1),
            };
        });
        return queryClient.invalidateQueries(
            {
                queryKey,
                exact,
            },
            restOptions,
        );
    };
}
