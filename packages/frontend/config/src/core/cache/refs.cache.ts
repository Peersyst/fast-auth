import { isPlainObject } from "@shared/utils";
import stableHash from "stable-hash";

/**
 * Class used to maintain references in a cache.
 * Sometimes we want to maintain references to values, even if their reference changes, the value stays the same.
 * This can be useful to prevent unnecessary re-renders in react.
 * @example
 * Without maintaining refs:
 * ```ts
 * const value = { a: 1, b: 2 }
 * const sameValue = { a: 1, b: 2 }
 * Object.is(value, sameValue) // false :(
 * ```
 *
 * Maintaining refs:
 * ```ts
 * const refsCache = new RefsCache();
 * const value = refsCache.get({ a: 1, b: 2 });
 * const sameValue = refsCache.get({ a: 1, b: 2 });
 * Object.is(value, sameValue) // true :)
 * ```
 */
export class RefsCache {
    /**
     * Map that holds the references by their hashed value.
     */
    refs: Map<string, any> = new Map<string, any>();

    /**
     * Gets a referenced value. (If the value is not in the cache, it is added to it)
     * @param value The value to get a reference for.
     * @returns The referenced value.
     */
    get<T>(value: T): T {
        if (!isPlainObject(value)) return value;

        const key = stableHash(value);

        if (!this.refs.has(key)) {
            this.refs.set(key, value);
        }

        return this.refs.get(key);
    }
}
