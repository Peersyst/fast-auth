/**
 * Joins the messages down an error's `cause` chain. The Auth0 SDK reports a network failure as "fetch failed" and keeps what
 * failed, such as DNS, in `cause`. Node reports a host whose every address refused as an AggregateError with an empty message
 * and an errno `code`.
 * @param error What was thrown.
 * @returns The distinct messages, or codes, joined with colons.
 */
export function causeChain(error: unknown): string {
    const messages: string[] = [];
    for (let current = error; current instanceof Error; current = current.cause) {
        const text = current.message || ("code" in current && typeof current.code === "string" ? current.code : "");
        if (text && messages.at(-1) !== text) messages.push(text);
    }
    return messages.length > 0 ? messages.join(": ") : String(error);
}
