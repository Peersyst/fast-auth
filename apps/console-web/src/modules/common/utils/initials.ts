/**
 * Takes the first character of a name's first two words, for an avatar.
 * @param name The name.
 * @returns The initials, upper-cased.
 */
export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => Array.from(word)[0])
        .join("")
        .toUpperCase();
}
