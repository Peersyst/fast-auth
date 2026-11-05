import { useQueryClient, InvalidateOptions, InvalidateQueryFilters } from "@tanstack/react-query";

/**
 * Returns a function to invalidate queries.
 * @returns A function to invalidate queries.
 */
export function useInvalidateQueries(): (filters?: InvalidateQueryFilters, options?: InvalidateOptions) => Promise<void> {
    const queryClient = useQueryClient();

    return function invalidateQueries(filters?: InvalidateQueryFilters, options?: InvalidateOptions): Promise<void> {
        return queryClient.invalidateQueries(filters, options);
    };
}
