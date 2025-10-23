type ExtractCascadeMethods<T> = {
    [k in keyof T]: T[k] extends (...args: any[]) => any ? T[k] : never;
};

/**
 * Creates a function that calls a method on a list of items in cascade.
 * @param items The items to call the method on.
 * @param method The method to call.
 * @returns A function that calls the method on the items in cascade.
 */
export function cascade<T, K extends keyof ExtractCascadeMethods<T>>(
    items: T[],
    method: K,
): (...args: Parameters<ExtractCascadeMethods<T>[K]>) => Promise<Awaited<ReturnType<ExtractCascadeMethods<T>[K]>>> {
    return function cascadeCall(
        ...args: Parameters<ExtractCascadeMethods<T>[K]>
    ): Promise<Awaited<ReturnType<ExtractCascadeMethods<T>[K]>>> {
        return _cascadeCall(items, method, args);
    };
}

/**
 * Internal function to call a method on an item in the cascade.
 * @param items The items to call the method on.
 * @param method The method to call.
 * @param args The arguments to pass to the method.
 * @param index The index of the item to call the method on.
 * @returns The result of the method call.
 */
async function _cascadeCall<T, K extends keyof ExtractCascadeMethods<T>, F extends (...args: any[]) => any>(
    items: T[],
    method: K,
    args: Parameters<F>,
    index = 0,
): Promise<Awaited<ReturnType<F>>> {
    try {
        // Use as any to avoid type errors from typescript not inferring previous types
        return await Promise.resolve((items[index] as any)[method](...args));
    } catch (error) {
        if (index < items.length - 1) {
            return _cascadeCall(items, method, args, index + 1);
        } else {
            throw error;
        }
    }
}
