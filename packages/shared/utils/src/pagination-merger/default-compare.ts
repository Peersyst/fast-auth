/**
 * Default compare function for pagination merger.
 * @param a The first item.
 * @param b The second item.
 * @returns True if the first item is less than or equal to the second item, false otherwise.
 */
export function defaultCompare<TItem>(a: TItem, b: TItem): boolean {
    return a <= b;
}
