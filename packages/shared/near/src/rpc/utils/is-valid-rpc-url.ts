/**
 * Check if the given URL is a valid RPC URL.
 * @param url The URL to check.
 * @returns A boolean indicating whether the URL is valid.
 */
export function isValidRPCUrl(url: unknown): boolean {
    return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
}
