import { DappError, PageError } from "./broker.errors";
import { DappReturn, Query } from "./broker.types";
import { isS256Challenge } from "./pkce";
import { redirectOrigin } from "./redirect-uri";

/** The params passed on to Auth0's /authorize. The action reads the signing payloads among them. */
const FORWARDED_PARAMS = ["scope", "audience", "nonce", "transaction", "delegateAction", "nep413"] as const;
const SIGNING_PARAMS = ["transaction", "delegateAction", "nep413"];
const MAX_STATE_LENGTH = 1024;

export interface AuthorizeRequest {
    dapp: DappReturn;
    /** The dApp's PKCE challenge, which its token request has to answer. */
    codeChallenge: string;
    /** The params to send on to Auth0's /authorize. */
    forward: Record<string, string>;
}

/**
 * Reads the /authorize request `auth0-spa-js` sends, as a dApp's sign-in starts.
 *
 * Until the client id and the redirect URI check out, the broker has no safe place to answer, so it throws a
 * PageError. Any later problem goes back to the dApp as a DappError.
 * @param query The query params.
 * @param clientId The broker's client id.
 * @param brokerOrigin The broker's own origin, which is no dApp's.
 * @returns The request.
 */
export function parseAuthorizeRequest(query: Query, clientId: string, brokerOrigin: string): AuthorizeRequest {
    if (query.client_id !== clientId) {
        throw new PageError("Unknown client_id. Use the NEAR Auth sandbox client id.");
    }
    const origin = redirectOrigin(query.redirect_uri);
    if (!origin || origin === brokerOrigin) {
        throw new PageError("redirect_uri must be an https URL, or an http one on localhost, with no fragment.");
    }

    const mode = query.response_mode;
    const dapp: DappReturn = {
        redirectUri: query.redirect_uri as string,
        origin,
        state: typeof query.state === "string" ? query.state : "",
        responseMode: mode === "web_message" ? "web_message" : "query",
    };
    const fail = (error: string, description: string) => new DappError(dapp, error, description);

    if (mode !== undefined && mode !== "query" && mode !== "web_message") {
        throw fail("invalid_request", "response_mode must be query or web_message");
    }
    if (query.response_type !== "code") {
        throw fail("unsupported_response_type", "response_type must be code");
    }
    if (!dapp.state || dapp.state.length > MAX_STATE_LENGTH) {
        throw fail("invalid_request", "state is required");
    }
    if (query.code_challenge_method !== "S256" || !isS256Challenge(query.code_challenge)) {
        throw fail("invalid_request", "PKCE with code_challenge_method S256 is required");
    }
    if (query.prompt !== undefined && typeof query.prompt !== "string") {
        throw fail("invalid_request", "prompt must be sent once");
    }
    const prompts = (query.prompt ?? "").split(" ");
    if (prompts.includes("none")) {
        throw fail("login_required", "The sandbox always asks the user to sign in");
    }

    const forward: Record<string, string> = {};
    for (const name of FORWARDED_PARAMS) {
        const value = query[name];
        if (value === undefined) continue;
        if (typeof value !== "string") throw fail("invalid_request", `${name} must be sent once`);
        forward[name] = value;
    }
    // A sign-in that only identifies the user always shows the login screen, so that no site learns who the user is
    // without them doing anything. A signing request ends on the consent form, which is the user's own action.
    const signing = SIGNING_PARAMS.some((name) => name in forward);
    if (!signing || prompts.includes("login")) forward.prompt = "login";

    return { dapp, codeChallenge: query.code_challenge, forward };
}
