/**
 * Check if the item is a plain object.
 * @param item The item to check.
 * @returns True if the item is a plain object, false otherwise.
 */
export function isPlainObject(item: unknown): item is Record<keyof any, unknown> {
    return item !== null && typeof item === "object" && item?.constructor === Object;
}
