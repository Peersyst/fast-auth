const DATE_TIME = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(iso: string): string {
    return DATE_TIME.format(new Date(iso));
}

export function shortClientId(clientId: string): string {
    return `${clientId.slice(0, 4)}…${clientId.slice(-4)}`;
}
