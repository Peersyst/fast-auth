import { DeepPick, NestedKeys } from "@swisstype/essential";

/**
 * Gets an attribute from an object.
 * @param obj The object to get the attribute from.
 * @param key The key to get the attribute from.
 * @returns The attribute.
 */
export function getAttribute<T extends object, K extends NestedKeys<T>>(
    obj: T,
    key: K,
    // @ts-ignore Not excessively deep (max 10 levels)
): DeepPick<T, K> {
    const [firstKey, ...restKeys] = key.split(".");

    // @ts-ignore+
    return restKeys.reduce((prev, curr) => prev[curr], obj[firstKey as keyof T]);
}
