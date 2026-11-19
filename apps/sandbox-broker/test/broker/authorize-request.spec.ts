import { parseAuthorizeRequest } from "../../src/modules/broker/authorize-request";
import { DappError, PageError } from "../../src/modules/broker/broker.errors";
import { Query } from "../../src/modules/broker/broker.types";
import { s256 } from "../../src/modules/broker/pkce";

const CLIENT_ID = "broker-client";
const BROKER = "https://sandbox.example";
const CHALLENGE = s256("v".repeat(43));

/**
 * Builds the query `auth0-spa-js` sends for a login, plus overrides.
 * @param overrides The params to change, or to drop with undefined.
 * @returns The query.
 */
const query = (overrides: Query = {}): Query => ({
    client_id: CLIENT_ID,
    redirect_uri: "https://my-dapp.example/callback",
    response_type: "code",
    response_mode: "query",
    state: "dapp-state",
    nonce: "dapp-nonce",
    scope: "openid profile email",
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
    auth0Client: "eyJuYW1lIjoiYXV0aDAtc3BhLWpzIn0=",
    ...overrides,
});

/**
 * Parses a query and returns the DappError it throws.
 * @param q The query.
 * @returns The error.
 */
const dappError = (q: Query): DappError => {
    try {
        parseAuthorizeRequest(q, CLIENT_ID, BROKER);
    } catch (error) {
        if (error instanceof DappError) return error;
        throw error;
    }
    throw new Error("parseAuthorizeRequest did not throw");
};

describe("parseAuthorizeRequest", () => {
    it("should read where and how to answer the dApp, and its PKCE challenge", () => {
        const request = parseAuthorizeRequest(query({ response_mode: "web_message" }), CLIENT_ID, BROKER);

        expect(request.dapp).toEqual({
            redirectUri: "https://my-dapp.example/callback",
            origin: "https://my-dapp.example",
            state: "dapp-state",
            responseMode: "web_message",
        });
        expect(request.codeChallenge).toBe(CHALLENGE);
    });

    it("should answer by redirect when no response mode is sent", () => {
        expect(parseAuthorizeRequest(query({ response_mode: undefined }), CLIENT_ID, BROKER).dapp.responseMode).toBe("query");
    });

    it("should forward only the params Auth0 and the action need, and force the login screen on a login", () => {
        const { forward } = parseAuthorizeRequest(query({ audience: "https://api.example", screen_hint: "signup" }), CLIENT_ID, BROKER);

        expect(forward).toEqual({ scope: "openid profile email", audience: "https://api.example", nonce: "dapp-nonce", prompt: "login" });
    });

    it.each(["transaction", "delegateAction", "nep413"])("should forward a %s and leave the login screen to Auth0's session", (name) => {
        const { forward } = parseAuthorizeRequest(query({ [name]: "1,2,3" }), CLIENT_ID, BROKER);

        expect(forward[name]).toBe("1,2,3");
        expect(forward.prompt).toBeUndefined();
    });

    it("should keep a signing request's own prompt=login", () => {
        expect(parseAuthorizeRequest(query({ transaction: "1,2,3", prompt: "login" }), CLIENT_ID, BROKER).forward.prompt).toBe("login");
    });

    it.each([
        ["an unknown client", { client_id: "other" }],
        ["no client", { client_id: undefined }],
        ["a redirect URI on plain http", { redirect_uri: "http://my-dapp.example/callback" }],
        ["no redirect URI", { redirect_uri: undefined }],
        ["a redirect URI on the broker itself", { redirect_uri: `${BROKER}/callback` }],
    ])("should not answer the dApp at all for %s", (_, overrides) => {
        expect(() => parseAuthorizeRequest(query(overrides), CLIENT_ID, BROKER)).toThrow(PageError);
    });

    it.each([
        ["a response mode it cannot answer by", { response_mode: "form_post" }, "invalid_request"],
        ["an implicit grant", { response_type: "token" }, "unsupported_response_type"],
        ["no state", { state: undefined }, "invalid_request"],
        ["no PKCE", { code_challenge: undefined }, "invalid_request"],
        ["plain PKCE", { code_challenge_method: "plain" }, "invalid_request"],
        ["a malformed challenge", { code_challenge: "short" }, "invalid_request"],
        ["a repeated prompt", { prompt: ["login", "none"] }, "invalid_request"],
        ["a repeated payload", { transaction: ["1", "2"] }, "invalid_request"],
        ["a silent sign-in", { prompt: "none" }, "login_required"],
        ["a silent signing request", { prompt: "none", transaction: "1,2,3" }, "login_required"],
    ])("should send the dApp an error for %s", (_, overrides, error) => {
        const thrown = dappError(query(overrides));

        expect(thrown.error).toBe(error);
        expect(thrown.dapp.origin).toBe("https://my-dapp.example");
    });

    it("should answer a popup's silent sign-in by postMessage", () => {
        expect(dappError(query({ prompt: "none", response_mode: "web_message" })).dapp.responseMode).toBe("web_message");
    });
});
