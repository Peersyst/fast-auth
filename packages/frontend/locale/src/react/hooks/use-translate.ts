import { FallbackNs, useTranslation, UseTranslationOptions, UseTranslationResponse } from "react-i18next";
import { FlatNamespace, KeyPrefix } from "i18next";

/**
 * Copied from node_modules/react-i18next/helpers.d.ts since the package doesn't have an export path.
 */
export type $Tuple<T> = readonly [T?, ...T[]];

/**
 * Hook to translate a string.
 * @param ns The namespace.
 * @param options The options.
 * @returns The translated string.
 */
export function useTranslate<
    Ns extends FlatNamespace | $Tuple<FlatNamespace> | undefined = undefined,
    KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined,
>(ns?: Ns, options?: UseTranslationOptions<KPrefix>): UseTranslationResponse<FallbackNs<Ns>, KPrefix>["t"] {
    return useTranslation<Ns, KPrefix>(ns, options).t;
}
