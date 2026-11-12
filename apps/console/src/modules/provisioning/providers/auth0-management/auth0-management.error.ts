import { AuthApiError, ManagementApiError, ResponseError } from "auth0";
import { Auth0ManagementConfig } from "../../../../config/auth0.config";
import { Auth0Call, Auth0Outcome } from "../../provisioning.metrics";

export type Failure = { outcome: Exclude<Auth0Outcome, "success">; retryAfterMs: number | null; message: string };

/**
 * Joins the messages down an error's `cause` chain. The Auth0 SDK reports a network failure as "fetch failed" and keeps what
 * failed, such as DNS, in `cause`. Node reports a host whose every address refused as an AggregateError with an empty message
 * and an errno `code`.
 * @param error What was thrown.
 * @returns The distinct messages, or codes, joined with colons.
 */
function causeChain(error: unknown): string {
    const messages: string[] = [];
    for (let current = error; current instanceof Error; current = current.cause) {
        const text = current.message || ("code" in current && typeof current.code === "string" ? current.code : "");
        if (text && messages.at(-1) !== text) messages.push(text);
    }
    return messages.length > 0 ? messages.join(": ") : String(error);
}

/**
 * Reads a 429's Retry-After header, capped, falling back to a default when it is missing or invalid.
 * @param headers The response headers.
 * @param management The config that holds the default wait and the cap.
 * @returns The wait before the retry, in milliseconds.
 */
function retryAfterMs(headers: Headers, management: Auth0ManagementConfig): number {
    const seconds = Number(headers.get("retry-after") ?? NaN);
    return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, management.maxRetryAfterMs) : management.retryAfterMs;
}

/**
 * Maps an SDK error to a metric outcome and decides whether the call may be retried once.
 * @param op The Auth0 call that failed.
 * @param error What the call threw.
 * @param management The config that holds the retry waits.
 * @returns The outcome, the wait before a retry or null for none, and the message.
 */
export function classify(op: Auth0Call, error: unknown, management: Auth0ManagementConfig): Failure {
    if (!(error instanceof ManagementApiError || error instanceof ResponseError || error instanceof AuthApiError)) {
        return { outcome: "failed", retryAfterMs: null, message: `Auth0 ${op} failed: ${causeChain(error)}` };
    }
    const status = error.statusCode;
    const message = `Auth0 ${op} answered ${status}: ${error.message}`;
    if (status === 429) return { outcome: "rate_limited", retryAfterMs: retryAfterMs(error.headers, management), message };
    // A 401 or 403, or a 4xx the token endpoint answers in JSON, means the console's own credentials or scopes are wrong, and
    // a 404 comes from a wrong template client id, a proxy, a wrong domain or a token endpoint that answered in HTML. A retry
    // fixes neither.
    if (status === 401 || status === 403 || status === 404 || (error instanceof AuthApiError && status < 500)) {
        return { outcome: "failed", retryAfterMs: null, message };
    }
    if (status >= 400 && status < 500) return { outcome: "rejected", retryAfterMs: null, message };
    // A create that answered 5xx may still have made the client, so a retry could make a second one.
    return { outcome: "failed", retryAfterMs: op === "create" ? null : management.retryAfterMs, message };
}
