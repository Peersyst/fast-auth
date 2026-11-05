import type { MutationOptions, QueryObserverOptions } from "@tanstack/react-query";

/**
 * `meta` flag stamped on every TanStack cache entry whose `data` or `variables` hold a value that
 * must not be cached, such as a secret.
 *
 * It is what lets code that walks the cache generically (a persister's dehydrate filter, most
 * importantly) recognise such an entry without knowing which hook produced it.
 */
export const NON_CACHEABLE_META_KEY = "nonCacheable";

/**
 * Cache policy for a mutation whose `variables` or returned `data` must not be cached.
 *
 * `gcTime: 0` makes TanStack drop the mutation from the `MutationCache` as soon as its last
 * observer detaches (`reset()` or unmount) instead of retaining it for the default five minutes,
 * so the value stops being reachable through `queryClient.getMutationCache()` and heap tooling.
 *
 * Spread it **after** the consumer options so it cannot be accidentally overridden:
 * `useMutation({ mutationFn, ...options, ...NON_CACHEABLE_MUTATION_OPTIONS })`.
 */
export const NON_CACHEABLE_MUTATION_OPTIONS = {
    gcTime: 0,
    meta: { [NON_CACHEABLE_META_KEY]: true },
} satisfies Pick<MutationOptions, "gcTime" | "meta">;

/**
 * Cache policy for a query whose `data` must not be cached.
 *
 * On top of the `gcTime: 0` retention rule it forces `staleTime: 0`, so the value is always read
 * again from its source of truth rather than served from a cached copy that outlives the consumer
 * that asked for it.
 *
 * Spread it **after** the consumer options so it cannot be accidentally overridden:
 * `useQuery({ queryKey, queryFn, ...options, ...NON_CACHEABLE_QUERY_OPTIONS })`.
 */
export const NON_CACHEABLE_QUERY_OPTIONS = {
    gcTime: 0,
    staleTime: 0,
    meta: { [NON_CACHEABLE_META_KEY]: true },
} satisfies Pick<QueryObserverOptions, "gcTime" | "staleTime" | "meta">;

/**
 * Whether a cache entry has been marked as non-cacheable.
 * @param entry The query or mutation to check.
 * @returns `true` when the entry must never be written outside memory.
 */
export function isNonCacheableEntry(entry: { meta?: Record<string, unknown> }): boolean {
    return entry.meta?.[NON_CACHEABLE_META_KEY] === true;
}
