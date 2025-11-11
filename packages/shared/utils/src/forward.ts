/**
 * Forwards the resolution of an object.
 * @param resolve The function to resolve the object.
 * @returns The object.
 */
export function forward<T>(resolve: () => T): T {
    return new Proxy(
        {},
        {
            get: (_target, key) => {
                return resolve()[key as keyof T];
            },
        },
    ) as T;
}
