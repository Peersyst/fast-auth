/**
 * Check if the item is a plain object.
 * @param item The item to check.
 * @returns True if the item is a plain object, false otherwise.
 */
export function isPlainObject(item: unknown): item is Record<keyof any, unknown> {
    return item !== null && typeof item === "object" && item?.constructor === Object;
}

export interface DeepmergeOptions {
    clone?: boolean;
}

/**
 * Deep merge two objects.
 * @param target The target object.
 * @param source The source object.
 * @param options The options.
 * @returns The merged object.
 */
export default function deepmerge<T, Q>(target: T, source: Q, options: DeepmergeOptions = { clone: true }): T & Q {
    const output = (options.clone ? { ...target } : target) as T & Q;

    if (isPlainObject(target) && isPlainObject(source)) {
        Object.keys(source).forEach((key) => {
            // Avoid prototype pollution
            if (key === "__proto__") {
                return;
            }

            if (isPlainObject(source[key]) && key in target && isPlainObject(target[key])) {
                // Since `output` is a clone of `target` and we have narrowed `target` in this block we can cast to the same type.
                (output as Record<keyof any, unknown>)[key] = deepmerge(target[key], source[key], options);
            } else {
                (output as Record<keyof any, unknown>)[key] = source[key];
            }
        });
    }

    return output;
}
