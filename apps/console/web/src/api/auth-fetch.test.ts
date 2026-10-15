import { GenericError, TimeoutError, type IdToken } from "@auth0/auth0-react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./client";
import { errorMessage } from "./error-message";
import { createAuthFetch } from "./auth-fetch";

type TokenSource = Parameters<typeof createAuthFetch>[0];

const API_URL = "http://localhost/api/console/dapp";

function fakeAuth(...tokens: { raw: string; expiresInS: number }[]) {
    let current = 0;
    const getIdTokenClaims = vi.fn(async () => {
        const token = tokens[current]!;
        return { __raw: token.raw, exp: Math.floor(Date.now() / 1000) + token.expiresInS } as IdToken;
    });
    const getAccessTokenSilently = vi.fn(async () => {
        current = Math.min(current + 1, tokens.length - 1);
        return "access-token";
    });
    return { auth: { getIdTokenClaims, getAccessTokenSilently } as unknown as TokenSource, getAccessTokenSilently };
}

function failingRenewal(expiresInS: number, error: Error) {
    const getIdTokenClaims = async () => ({ __raw: "token-1", exp: Math.floor(Date.now() / 1000) + expiresInS }) as IdToken;
    const getAccessTokenSilently = vi.fn(async () => {
        throw error;
    });
    return { getIdTokenClaims, getAccessTokenSilently } as unknown as TokenSource;
}

function fakeFetch(...statuses: number[]) {
    let call = 0;
    const baseFetch = vi.fn(async (_request: Request) => new Response(null, { status: statuses[Math.min(call++, statuses.length - 1)] }));
    vi.stubGlobal("fetch", baseFetch);
    return baseFetch;
}

function sentToken(baseFetch: ReturnType<typeof fakeFetch>, call: number) {
    return baseFetch.mock.calls[call]?.[0].headers.get("Authorization");
}

describe("createAuthFetch", () => {
    it("sends the ID token as the Bearer token", async () => {
        const { auth, getAccessTokenSilently } = fakeAuth({ raw: "token-1", expiresInS: 3600 });
        const baseFetch = fakeFetch(200);

        const response = await createAuthFetch(auth)(new Request(API_URL));

        expect(response.status).toBe(200);
        expect(sentToken(baseFetch, 0)).toBe("Bearer token-1");
        expect(getAccessTokenSilently).not.toHaveBeenCalled();
    });

    it("renews the ID token first when it expires within 60 seconds", async () => {
        const { auth, getAccessTokenSilently } = fakeAuth({ raw: "token-1", expiresInS: 30 }, { raw: "token-2", expiresInS: 3600 });
        const baseFetch = fakeFetch(200);

        await createAuthFetch(auth)(new Request(API_URL));

        expect(getAccessTokenSilently).toHaveBeenCalledOnce();
        expect(getAccessTokenSilently).toHaveBeenCalledWith({ cacheMode: "off" });
        expect(sentToken(baseFetch, 0)).toBe("Bearer token-2");
    });

    it("renews the token and retries once after a 401, with the same body", async () => {
        const { auth, getAccessTokenSilently } = fakeAuth({ raw: "token-1", expiresInS: 3600 }, { raw: "token-2", expiresInS: 3600 });
        const baseFetch = fakeFetch(401, 200);
        const body = JSON.stringify({ name: "Acme" });

        const response = await createAuthFetch(auth)(new Request(API_URL, { method: "POST", body }));

        expect(response.status).toBe(200);
        expect(baseFetch).toHaveBeenCalledTimes(2);
        expect(getAccessTokenSilently).toHaveBeenCalledOnce();
        expect(getAccessTokenSilently).toHaveBeenCalledWith({ cacheMode: "off" });
        expect(sentToken(baseFetch, 0)).toBe("Bearer token-1");
        expect(sentToken(baseFetch, 1)).toBe("Bearer token-2");
        await expect(baseFetch.mock.calls[1]![0].text()).resolves.toBe(body);
    });

    it("returns the second 401 instead of retrying again", async () => {
        const { auth, getAccessTokenSilently } = fakeAuth({ raw: "token-1", expiresInS: 3600 }, { raw: "token-2", expiresInS: 3600 });
        const baseFetch = fakeFetch(401);

        const response = await createAuthFetch(auth)(new Request(API_URL));

        expect(response.status).toBe(401);
        expect(baseFetch).toHaveBeenCalledTimes(2);
        expect(getAccessTokenSilently).toHaveBeenCalledOnce();
    });

    it("turns a renewal Auth0 refuses into UNAUTHENTICATED, which asks the user to sign in again", async () => {
        const baseFetch = fakeFetch(200);
        const auth = failingRenewal(30, new GenericError("consent_required", "Consent required"));

        const error = await createAuthFetch(auth)(new Request(API_URL)).catch((thrown: unknown) => thrown);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ statusCode: 401, code: "UNAUTHENTICATED" });
        expect(errorMessage(error)).toBe("Your session has expired. Sign out and sign in again.");
        expect(baseFetch).not.toHaveBeenCalled();
    });

    it.each([
        ["a timeout", new TimeoutError()],
        ["an Auth0 5xx", new GenericError("request_error", "HTTP error. Unable to fetch https://login/oauth/token")],
        ["a rate limit", new GenericError("too_many_requests", "Too many requests")],
    ])("lets %s during a renewal through, so the request can be retried", async (_name, failure) => {
        const auth = failingRenewal(30, failure);
        fakeFetch(200);

        const error = await createAuthFetch(auth)(new Request(API_URL)).catch((thrown: unknown) => thrown);

        expect(error).toBe(failure);
        expect(errorMessage(error)).toBe("NEAR Auth could not renew your session. Try again in a minute.");
    });

    it("turns a renewal Auth0 refuses after a 401 into UNAUTHENTICATED", async () => {
        const baseFetch = fakeFetch(401);
        const auth = failingRenewal(3600, new GenericError("login_required", "Login required"));

        const error = await createAuthFetch(auth)(new Request(API_URL)).catch((thrown: unknown) => thrown);

        expect(error).toMatchObject({ statusCode: 401, code: "UNAUTHENTICATED" });
        expect(baseFetch).toHaveBeenCalledOnce();
    });

    it("lets an Auth0 5xx during the renewal after a 401 through", async () => {
        const failure = new GenericError("request_error", "HTTP error. Unable to fetch https://login/oauth/token");
        const baseFetch = fakeFetch(401);

        const error = await createAuthFetch(failingRenewal(3600, failure))(new Request(API_URL)).catch((thrown: unknown) => thrown);

        expect(error).toBe(failure);
        expect(baseFetch).toHaveBeenCalledOnce();
    });

    it("does not retry other errors", async () => {
        const { auth, getAccessTokenSilently } = fakeAuth({ raw: "token-1", expiresInS: 3600 });
        const baseFetch = fakeFetch(403);

        const response = await createAuthFetch(auth)(new Request(API_URL));

        expect(response.status).toBe(403);
        expect(baseFetch).toHaveBeenCalledOnce();
        expect(getAccessTokenSilently).not.toHaveBeenCalled();
    });
});
