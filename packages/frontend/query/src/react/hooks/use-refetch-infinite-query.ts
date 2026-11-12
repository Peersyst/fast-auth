import { RefetchOptions, useQueryClient, InfiniteData, QueryKey } from "@tanstack/react-query";

export type RefetchInfiniteQueryOptions = RefetchOptions & {
    exact?: boolean;
};

/**
 * Returns a function to refetch an infinite query including only its first page.
 * @returns A function to refetch an infinite query including only its first page.
 */
export function useRefetchInfiniteQuery(): (queryKey: QueryKey, options?: RefetchInfiniteQueryOptions) => Promise<void> {
    const queryClient = useQueryClient();

    return function refetchInfiniteQuery(
        queryKey: QueryKey,
        { exact = true, ...restOptions }: RefetchInfiniteQueryOptions = {},
    ): Promise<void> {
        // Set the query data to the first page of the query in order to avoid refetching all pages
        queryClient.setQueryData(queryKey, (prev: InfiniteData<any>) => {
            return {
                pages: prev.pages?.slice(0, 1),
                pageParams: prev.pageParams?.slice(0, 1),
            };
        });
        return queryClient.refetchQueries(
            {
                queryKey,
                exact,
            },
            restOptions,
        );
    };
}
