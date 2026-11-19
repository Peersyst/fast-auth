// Plain http can be tampered with on the way, so only a page on the developer's own machine may use it.
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);
const MAX_LENGTH = 2048;

/**
 * Reads the origin of a URL the broker may send a user back to.
 * That is an https URL, or an http one on a local host, with no credentials or fragment. The sandbox is open, so any
 * such URL will do.
 * @param value The URL the dApp sent, as `redirect_uri` or `returnTo`.
 * @returns Its origin, or null when the broker must not send anyone there.
 */
export function redirectOrigin(value: unknown): string | null {
    if (typeof value !== "string" || value.length > MAX_LENGTH || value.includes("#") || !URL.canParse(value)) return null;
    const url = new URL(value);
    const secure = url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTNAMES.has(url.hostname));
    return secure && !url.username && !url.password ? url.origin : null;
}
