const DATE_TIME = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/**
 * Formats an instant for the reader's locale and time zone.
 * @param iso The instant as an ISO 8601 string.
 * @returns The date and time, such as `Oct 1, 2026, 10:00 AM`.
 */
export function formatDateTime(iso: string): string {
    return DATE_TIME.format(new Date(iso));
}

/**
 * Shortens an Auth0 client id to its first and last four characters.
 * @param clientId The client id.
 * @returns The short form, such as `abcD…F123`.
 */
export function shortClientId(clientId: string): string {
    return `${clientId.slice(0, 4)}…${clientId.slice(-4)}`;
}
