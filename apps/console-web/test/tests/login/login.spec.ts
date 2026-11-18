import { webcrypto } from "node:crypto";
import { buildAuthorizeUrl, decodeLoginState, encodeLoginState, runAuthorize, runCallback } from "../../../login/login.js";

const config = {
    auth0Url: "https://login.example.com",
    clientId: "open-client",
    callbackUrl: "https://console.example.com/login/testnet/callback.html",
};

const VERIFIER = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
const CHALLENGE = "6oZqdX5MOLq_qBJ8vppAnT4fk6AP8UiP9zX8-Rev_9A";
const VERIFIER_KEY = "fast-auth-login-verifier:";
const STATE = encodeLoginState("https://dapp.example", "wallet-state");

/**
 * Builds a fake sessionStorage.
 * @param entries The entries it starts with.
 * @returns The storage and the map behind it.
 */
function makeStorage(entries: Record<string, string> = {}) {
    const items = new Map(Object.entries(entries));
    return {
        items,
        storage: {
            getItem: (key: string) => items.get(key) ?? null,
            setItem: (key: string, value: string) => void items.set(key, value),
            removeItem: (key: string) => void items.delete(key),
        },
    };
}

/**
 * Runs the authorize page against a fake window.
 * @param search The page's query string.
 * @param pageConfig What `./config.json` holds, or an Error to make the request fail.
 * @param overrides Parts of the fake window to replace.
 * @returns The message element, the replace spy, the fetch spy and what the page stored.
 */
async function authorize(search: string, pageConfig: unknown = config, overrides: object = {}) {
    const message = { textContent: "Redirecting to sign in..." };
    const replace = jest.fn();
    const fetch = jest.fn(async () => {
        if (pageConfig instanceof Error) throw pageConfig;
        return { json: async () => pageConfig };
    });
    const { items, storage } = makeStorage();
    const crypto = {
        subtle: webcrypto.subtle,
        getRandomValues: (array: Uint8Array) => array.map((_, i) => i),
    };
    await runAuthorize({
        document: { getElementById: () => message },
        location: { search, replace },
        fetch,
        crypto,
        sessionStorage: storage,
        ...overrides,
    });
    return { message, replace, fetch, items };
}

/**
 * Runs the callback page against a fake window.
 * @param search The page's query string.
 * @param opener The window that opened this one, or null.
 * @param stored What sessionStorage holds.
 * @param tokenResponse What the token endpoint answers, or an Error to make the request fail.
 * @returns The message element, the close spy, the fetch spy, what is left in storage and the page's promise.
 */
function callback(search: string, opener: { postMessage: jest.Mock } | null, stored: Record<string, string> = {}, tokenResponse?: unknown) {
    const message = { textContent: "Signing you in..." };
    const close = jest.fn();
    const { items, storage } = makeStorage(stored);
    const fetch = jest.fn(async (url: string) => {
        if (url === "./config.json") return { json: async () => config };
        if (tokenResponse instanceof Error) throw tokenResponse;
        return tokenResponse;
    });
    const done = runCallback({
        document: { getElementById: () => message },
        location: { search },
        opener,
        close,
        fetch,
        sessionStorage: storage,
    });
    return { message, close, fetch, items, done };
}

describe("login state", () => {
    it("should encode to the documented base64url JSON shape", () => {
        expect(encodeLoginState("https://dapp.example", "abc")).toBe("eyJvIjoiaHR0cHM6Ly9kYXBwLmV4YW1wbGUiLCJzIjoiYWJjIn0");
    });

    it.each([
        ["a~b?c>", "eyJvIjoiaHR0cHM6Ly9kYXBwLmV4YW1wbGUiLCJzIjoiYX5iP2M-In0"],
        ["a???", "eyJvIjoiaHR0cHM6Ly9kYXBwLmV4YW1wbGUiLCJzIjoiYT8_PyJ9"],
    ])("should encode %s with the url-safe alphabet and no padding", (wallet, encoded) => {
        expect(encodeLoginState("https://dapp.example", wallet)).toBe(encoded);
        expect(decodeLoginState(encoded)).toEqual({ o: "https://dapp.example", s: wallet });
    });

    it("should round trip the origin and a non-ASCII wallet state", () => {
        const wallet = "a+b/c=?&é";
        expect(decodeLoginState(encodeLoginState("http://localhost:3000", wallet))).toEqual({ o: "http://localhost:3000", s: wallet });
    });

    it.each(["http://localhost", "http://localhost:5173", "http://127.0.0.1:3000"])(
        "should accept plain http on the local host %s",
        (origin) => {
            expect(decodeLoginState(encodeLoginState(origin, "s"))).toEqual({ o: origin, s: "s" });
        },
    );

    it.each([
        ["not base64 JSON", "%%%"],
        ["empty", ""],
        ["json without fields", btoa("{}")],
        ["an origin with a path", encodeLoginState("https://dapp.example/", "s")],
        ["a non-http origin", encodeLoginState("javascript:alert(1)", "s")],
        ["a plain http origin on a public host", encodeLoginState("http://dapp.example", "s")],
        ["a plain http origin on a local address other than 127.0.0.1", encodeLoginState("http://127.0.0.2", "s")],
        ["a host with entity text", encodeLoginState("https://trusted.com&sol;&quest;.evil.io", "s")],
        ["a non-string wallet state", btoa(JSON.stringify({ o: "https://dapp.example", s: 1 }))],
    ])("should reject %s", (_name, state) => {
        expect(decodeLoginState(state)).toBeNull();
    });
});

describe("buildAuthorizeUrl", () => {
    it("should forward the allowlisted params and set the binding params last", () => {
        const params = new URLSearchParams({
            origin: "https://dapp.example",
            state: "wallet-state",
            scope: "openid email",
            nonce: "n1",
            delegateAction: "da",
            client_id: "attacker",
            redirect_uri: "https://evil.example/cb",
            response_type: "token",
            response_mode: "web_message",
            connection: "google-oauth2",
        });
        expect(buildAuthorizeUrl(config, "https://dapp.example", "wallet-state", params)).toBe(
            "https://login.example.com/authorize?scope=openid+email&nonce=n1&delegateAction=da" +
                "&client_id=open-client&redirect_uri=https%3A%2F%2Fconsole.example.com%2Flogin%2Ftestnet%2Fcallback.html" +
                "&response_type=code&state=eyJvIjoiaHR0cHM6Ly9kYXBwLmV4YW1wbGUiLCJzIjoid2FsbGV0LXN0YXRlIn0",
        );
    });

    it("should drop a repeated param instead of joining it", () => {
        const params = new URLSearchParams("scope=a&scope=b&nonce=n1");
        const forwarded = new URL(buildAuthorizeUrl(config, "https://dapp.example", "s", params)).searchParams;
        expect(forwarded.has("scope")).toBe(false);
        expect(forwarded.get("nonce")).toBe("n1");
    });
});

describe("authorize page", () => {
    it("should read ./config.json and replace the page with the Auth0 authorize URL", async () => {
        const { replace, fetch, items } = await authorize(
            "?origin=https%3A%2F%2Fdapp.example&state=s&nonce=n1&response_mode=web_message&scope=a&scope=b" +
                "&code_challenge=theirs&code_challenge_method=S256",
        );
        expect(fetch).toHaveBeenCalledWith("./config.json", { cache: "no-store" });
        expect(replace).toHaveBeenCalledWith(
            "https://login.example.com/authorize?nonce=n1&code_challenge=theirs&code_challenge_method=S256&client_id=open-client" +
                "&redirect_uri=https%3A%2F%2Fconsole.example.com%2Flogin%2Ftestnet%2Fcallback.html" +
                "&response_type=code&state=eyJvIjoiaHR0cHM6Ly9kYXBwLmV4YW1wbGUiLCJzIjoicyJ9",
        );
        expect(items.size).toBe(0);
    });

    it("should run PKCE itself and keep the verifier when the caller sends no challenge", async () => {
        const { replace, items } = await authorize("?origin=https%3A%2F%2Fdapp.example&state=wallet-state&code_challenge_method=plain");
        expect(replace).toHaveBeenCalledWith(
            `https://login.example.com/authorize?code_challenge_method=S256&code_challenge=${CHALLENGE}&client_id=open-client` +
                "&redirect_uri=https%3A%2F%2Fconsole.example.com%2Flogin%2Ftestnet%2Fcallback.html" +
                `&response_type=code&state=${STATE}`,
        );
        expect([...items]).toEqual([[VERIFIER_KEY + STATE, VERIFIER]]);
    });

    it.each([
        ["has no Web Crypto, as on an insecure origin", { crypto: { getRandomValues: (array: Uint8Array) => array } }],
        [
            "blocks storage",
            {
                sessionStorage: {
                    setItem: () => {
                        throw new Error("blocked");
                    },
                },
            },
        ],
    ])("should show an error and not redirect when the browser %s", async (_name, overrides) => {
        const { message, replace } = await authorize("?origin=https%3A%2F%2Fdapp.example&state=s", config, overrides);
        expect(replace).not.toHaveBeenCalled();
        expect(message.textContent).toBe("This browser cannot sign in here.");
    });

    it.each([
        ["a missing origin", "?state=s"],
        ["an origin with a path", "?origin=https%3A%2F%2Fdapp.example%2Fpath&state=s"],
        ["an origin with a trailing slash", "?origin=https%3A%2F%2Fdapp.example%2F&state=s"],
        ["a non-http origin", "?origin=ftp%3A%2F%2Fdapp.example&state=s"],
        ["a plain http origin on a public host", "?origin=http%3A%2F%2Fdapp.example&state=s"],
        ["a plain http origin that only starts with localhost", "?origin=http%3A%2F%2Flocalhost.evil.example&state=s"],
        ["a null origin", "?origin=null&state=s"],
        ["a host with entity text", `?origin=${encodeURIComponent("https://trusted.com&sol;&quest;.evil.io")}&state=s`],
        ["a host with an underscore", "?origin=https%3A%2F%2Fdapp_example.com&state=s"],
        ["a repeated origin", "?origin=https%3A%2F%2Fa.example&origin=https%3A%2F%2Fb.example&state=s"],
    ])("should show an error and not redirect for %s", async (_name, search) => {
        const { message, replace } = await authorize(search);
        expect(replace).not.toHaveBeenCalled();
        expect(message.textContent).toBe("origin must be an https origin, such as https://example.com, or a localhost one.");
    });

    it.each([
        ["a missing state", "?origin=https%3A%2F%2Fdapp.example"],
        ["an empty state", "?origin=https%3A%2F%2Fdapp.example&state="],
        ["a duplicate state", "?origin=https%3A%2F%2Fdapp.example&state=a&state=b"],
    ])("should show an error and not redirect for %s", async (_name, search) => {
        const { message, replace } = await authorize(search);
        expect(replace).not.toHaveBeenCalled();
        expect(message.textContent).toBe("state is required.");
    });

    it.each([
        ["a placeholder client id", { ...config, clientId: "TO_REPLACE_WITH_TESTNET_CLIENT" }],
        ["a placeholder domain", { ...config, auth0Url: "https://TO_REPLACE_WITH_MAINNET_TESTING_DOMAIN" }],
        ["a missing callback URL", { auth0Url: config.auth0Url, clientId: config.clientId }],
        ["an unreadable config", new Error("404")],
    ])("should show that login is not configured for %s", async (_name, pageConfig) => {
        const { message, replace } = await authorize("?origin=https%3A%2F%2Fdapp.example&state=s", pageConfig);
        expect(replace).not.toHaveBeenCalled();
        expect(message.textContent).toBe("Login is not configured.");
    });
});

describe("callback page", () => {
    it("should post the response to the dapp origin with the wallet state restored, then close", () => {
        const opener = { postMessage: jest.fn() };
        const { close } = callback(`?code=c1&state=${STATE}&error=access_denied&error_description=No+way`, opener);
        expect(opener.postMessage).toHaveBeenCalledWith(
            {
                type: "authorization_response",
                response: { code: "c1", state: "wallet-state", error: "access_denied", error_description: "No way" },
            },
            "https://dapp.example",
        );
        expect(close).toHaveBeenCalled();
    });

    it("should post only what Auth0 sends back, so a token in the callback URL never reaches the dapp", () => {
        const opener = { postMessage: jest.fn() };
        callback(`?state=${STATE}&id_token=forged&access_token=forged&code=c1`, opener);
        expect(opener.postMessage).toHaveBeenCalledWith(
            { type: "authorization_response", response: { state: "wallet-state", code: "c1" } },
            "https://dapp.example",
        );
    });

    it("should refuse a state that is not decodable", () => {
        const opener = { postMessage: jest.fn() };
        const { message, close } = callback("?code=c1&state=garbage", opener);
        expect(opener.postMessage).not.toHaveBeenCalled();
        expect(close).not.toHaveBeenCalled();
        expect(message.textContent).toBe("This sign-in link is invalid. Close this window and try again.");
    });

    it.each([
        ["an origin with a path", "https://dapp.example/path"],
        ["a non-http origin", "ftp://dapp.example"],
    ])("should refuse a state that carries %s", (_name, origin) => {
        const opener = { postMessage: jest.fn() };
        const { message, close } = callback(`?code=c1&state=${encodeLoginState(origin, "s")}`, opener);
        expect(opener.postMessage).not.toHaveBeenCalled();
        expect(close).not.toHaveBeenCalled();
        expect(message.textContent).toBe("This sign-in link is invalid. Close this window and try again.");
    });

    it.each([
        [
            "a duplicate state",
            `?state=${encodeLoginState("https://dapp.example", "a")}&state=${encodeLoginState("https://evil.example", "b")}`,
        ],
        ["a missing state", "?code=c1"],
    ])("should refuse %s", (_name, search) => {
        const opener = { postMessage: jest.fn() };
        const { message } = callback(search, opener);
        expect(opener.postMessage).not.toHaveBeenCalled();
        expect(message.textContent).toBe("This sign-in link is invalid. Close this window and try again.");
    });

    it("should redeem the code and post the tokens when these pages ran PKCE", async () => {
        const opener = { postMessage: jest.fn() };
        const { close, fetch, items, done } = callback(
            `?code=c1&state=${STATE}`,
            opener,
            { [VERIFIER_KEY + STATE]: VERIFIER },
            {
                ok: true,
                json: async () => ({ id_token: "id", access_token: "access", refresh_token: "never forwarded" }),
            },
        );
        await done;
        expect(fetch).toHaveBeenLastCalledWith("https://login.example.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: "open-client",
                code_verifier: VERIFIER,
                code: "c1",
                redirect_uri: "https://console.example.com/login/testnet/callback.html",
            }),
        });
        expect(opener.postMessage).toHaveBeenCalledWith(
            { type: "authorization_response", response: { state: "wallet-state", id_token: "id", access_token: "access" } },
            "https://dapp.example",
        );
        expect(items.size).toBe(0);
        expect(close).toHaveBeenCalled();
    });

    it.each([
        ["refuses the code", { ok: false }],
        ["answers without an ID token", { ok: true, json: async () => ({}) }],
        ["cannot be reached", new Error("network")],
    ])("should post an error when the token endpoint %s", async (_name, tokenResponse) => {
        const opener = { postMessage: jest.fn() };
        const { items, done } = callback(`?code=c1&state=${STATE}`, opener, { [VERIFIER_KEY + STATE]: VERIFIER }, tokenResponse);
        await done;
        expect(items.size).toBe(0);
        expect(opener.postMessage).toHaveBeenCalledWith(
            { type: "authorization_response", response: { state: "wallet-state", error: "token_exchange_failed" } },
            "https://dapp.example",
        );
    });

    it("should pass an Auth0 error through and drop the verifier", async () => {
        const opener = { postMessage: jest.fn() };
        const { fetch, items, done } = callback(`?error=access_denied&state=${STATE}`, opener, { [VERIFIER_KEY + STATE]: VERIFIER });
        await done;
        expect(fetch).not.toHaveBeenCalled();
        expect(opener.postMessage).toHaveBeenCalledWith(
            { type: "authorization_response", response: { state: "wallet-state", error: "access_denied" } },
            "https://dapp.example",
        );
        expect(items.size).toBe(0);
    });

    it("should post the code as it is when storage is blocked", async () => {
        const opener = { postMessage: jest.fn() };
        const message = { textContent: "" };
        await runCallback({
            document: { getElementById: () => message },
            location: { search: `?code=c1&state=${STATE}` },
            opener,
            close: jest.fn(),
            get sessionStorage(): never {
                throw new Error("blocked");
            },
        });
        expect(opener.postMessage).toHaveBeenCalledWith(
            { type: "authorization_response", response: { code: "c1", state: "wallet-state" } },
            "https://dapp.example",
        );
    });

    it("should tell the user to return to the app when there is no opener", () => {
        const { message, close } = callback(`?state=${encodeLoginState("https://dapp.example", "s")}`, null);
        expect(close).not.toHaveBeenCalled();
        expect(message.textContent).toBe("Return to the app that opened this window and try again.");
    });
});
