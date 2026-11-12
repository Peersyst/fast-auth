import { QueryPluginOptions, QueryPluginKey, QueryPluginFn, QueryPluginResult } from "../types";

export type ForwardedQueryPlugin<TQueryPluginOptions extends QueryPluginOptions = QueryPluginOptions> = (
    queryKey: QueryPluginKey,
    queryFn: QueryPluginFn,
    options: TQueryPluginOptions,
) => QueryPluginResult;

/**
 * Forwards a query plugin.
 * This is just a util to avoid rewriting a function every time a query plugin is forwarded.
 * @param queryPlugin The query plugin to forward.
 * @returns The forwarded query plugin.
 */
export function forwardQueryPlugin<TQueryPluginOptions extends QueryPluginOptions = QueryPluginOptions>(
    queryPlugin: ForwardedQueryPlugin<TQueryPluginOptions>,
): ForwardedQueryPlugin<TQueryPluginOptions> {
    return queryPlugin;
}
