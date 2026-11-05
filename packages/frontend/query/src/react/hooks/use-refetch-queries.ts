import { useQueryClient, RefetchQueryFilters, RefetchOptions } from "@tanstack/react-query";

/**
 * Returns a function to refetch queries.
 * @returns A function to refetch queries.
 */
export function useRefetchQueries(): (filters?: RefetchQueryFilters, options?: RefetchOptions) => Promise<void> {
    const queryClient = useQueryClient();

    return function refetchQueries(filters?: RefetchQueryFilters, options?: RefetchOptions): Promise<void> {
        return queryClient.refetchQueries(filters, options);
    };
}
