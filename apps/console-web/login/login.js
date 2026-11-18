/**
 * Open Auth0 login pages. Anyone can use them, so there is no allowlist and no origin verification.
 * The dapp origin travels in `state`, which the Auth0 action reads as the consent-screen name, so the name
 * shown and the delivery target always agree. Browser-native ES: it is served as is, never bundled.
 *
 * A caller that sends its own `code_challenge` gets the authorization code back and redeems it itself. A caller
 * that sends none gets the tokens: these pages run PKCE and redeem the code, because Auth0 only lets the token
 * response be read from a registered origin, which a dapp page is not and the callback page is.
 */

const FORWARDED_PARAMS = [
    "scope",
    "audience",
    "prompt",
    "nonce",
    "code_challenge",
    "code_challenge_method",
    "transaction",
    "delegateAction",
    "nep413",
];

const PLACEHOLDER = "TO_REPLACE";
const VERIFIER_KEY = "fast-auth-login-verifier:";
// Stricter than a valid URL host: the Auth0 action shows the origin as the name on the consent screen.
const ORIGIN_HOST = /^[a-z0-9.-]+$/;
// Plain http can be altered on the network, and the callback posts tokens to the origin, so only a local page may use it.
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

/**
 * Whether a value is an exact https origin, or an http one on a local host, with no path, trailing slash, query or credentials.
 * Its host may only hold lower case letters, digits, dots, hyphens and a port.
 * @param value The value to check.
 * @returns True if the value is an origin.
 */
export function isOrigin(value) {
    if (typeof value !== "string") return false;
    try {
        const url = new URL(value);
        const secure = url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.includes(url.hostname));
        return secure && url.origin === value && ORIGIN_HOST.test(url.hostname);
    } catch {
        return false;
    }
}

/**
 * Encodes bytes as base64url without padding.
 * @param bytes The bytes to encode.
 * @returns The base64url string.
 */
function base64Url(bytes) {
    return btoa(String.fromCharCode(...bytes))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
}

/**
 * Reads `./config.json`.
 * @param win The page's window.
 * @returns The tenant config, or null when it is missing, malformed or still holds a placeholder.
 */
async function readConfig(win) {
    let config;
    try {
        const response = await win.fetch("./config.json", { cache: "no-store" });
        config = await response.json();
    } catch {
        return null;
    }
    const { auth0Url, clientId, callbackUrl } = config ?? {};
    return [auth0Url, clientId, callbackUrl].every((v) => typeof v === "string" && v && !v.includes(PLACEHOLDER)) ? config : null;
}

/**
 * Packs the dapp origin and the wallet state into the `state` sent to Auth0.
 * @param o The dapp origin.
 * @param s The wallet state.
 * @returns The base64url encoded state, without padding.
 */
export function encodeLoginState(o, s) {
    return base64Url(new TextEncoder().encode(JSON.stringify({ o, s })));
}

/**
 * Unpacks a `state` built by {@link encodeLoginState}.
 * @param state The base64url encoded state.
 * @returns The decoded state, or null if it is malformed or {@link isOrigin} refuses its origin.
 */
export function decodeLoginState(state) {
    try {
        const b64 = state.replaceAll("-", "+").replaceAll("_", "/");
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const { o, s } = JSON.parse(new TextDecoder().decode(bytes));
        return isOrigin(o) && typeof s === "string" ? { o, s } : null;
    } catch {
        return null;
    }
}

/**
 * Builds the Auth0 authorize URL. Only allowlisted caller params are forwarded, and the params that bind the
 * flow to these pages are set last so a caller cannot override them.
 * @param config The tenant config.
 * @param origin The validated dapp origin.
 * @param state The wallet state.
 * @param params The caller's query params.
 * @param challenge The PKCE challenge of these pages, or empty when the caller sent its own.
 * @returns The URL to redirect to.
 */
export function buildAuthorizeUrl(config, origin, state, params, challenge = "") {
    const url = new URL("/authorize", config.auth0Url);
    for (const name of FORWARDED_PARAMS) {
        const values = params.getAll(name);
        if (values.length === 1) url.searchParams.set(name, values[0]);
    }
    if (challenge) {
        url.searchParams.set("code_challenge", challenge);
        url.searchParams.set("code_challenge_method", "S256");
    }
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.callbackUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", encodeLoginState(origin, state));
    return url.toString();
}

/**
 * The authorize page. Reads `./config.json` and the query, then replaces the page with the Auth0 authorize URL.
 * Shows a message and does not redirect when the tenant is not configured or the query is invalid.
 * @param win The page's window.
 * @returns A promise that settles once the page has redirected or shown its message.
 */
export async function runAuthorize(win) {
    const message = win.document.getElementById("message");
    const fail = (text) => {
        message.textContent = text;
    };
    const config = await readConfig(win);
    if (!config) return fail("Login is not configured.");
    const params = new URLSearchParams(win.location.search);
    const origins = params.getAll("origin");
    if (origins.length !== 1 || !isOrigin(origins[0])) {
        return fail("origin must be an https origin, such as https://example.com, or a localhost one.");
    }
    const states = params.getAll("state");
    if (states.length !== 1 || states[0] === "") return fail("state is required.");
    let challenge = "";
    if (!params.has("code_challenge")) {
        // Storage can be blocked, and Web Crypto is missing on an insecure origin.
        try {
            const verifier = base64Url(win.crypto.getRandomValues(new Uint8Array(32)));
            challenge = base64Url(new Uint8Array(await win.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
            win.sessionStorage.setItem(VERIFIER_KEY + encodeLoginState(origins[0], states[0]), verifier);
        } catch {
            return fail("This browser cannot sign in here.");
        }
    }
    win.location.replace(buildAuthorizeUrl(config, origins[0], states[0], params, challenge));
}

/**
 * Redeems the authorization code with the verifier these pages kept.
 * @param win The page's window.
 * @param code The authorization code.
 * @param verifier The PKCE verifier.
 * @returns The ID token and the access token, or null when the exchange fails.
 */
async function redeemCode(win, code, verifier) {
    const config = await readConfig(win);
    if (!config) return null;
    try {
        const response = await win.fetch(new URL("/oauth/token", config.auth0Url).href, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: config.clientId,
                code_verifier: verifier,
                code,
                redirect_uri: config.callbackUrl,
            }),
        });
        const { id_token, access_token } = response.ok ? await response.json() : {};
        return typeof id_token === "string" ? { id_token, access_token } : null;
    } catch {
        return null;
    }
}

/**
 * The callback page. Hands the Auth0 response to the dapp that opened this window, at the origin carried in
 * `state`, then closes the window. When these pages ran PKCE, it redeems the code first and hands over the tokens.
 * @param win The page's window.
 * @returns A promise that settles once the page has answered the dapp or shown its message.
 */
export async function runCallback(win) {
    const message = win.document.getElementById("message");
    const fail = (text) => {
        message.textContent = text;
    };
    const params = new URLSearchParams(win.location.search);
    const states = params.getAll("state");
    const decoded = states.length === 1 ? decodeLoginState(states[0]) : null;
    if (!decoded) {
        fail("This sign-in link is invalid. Close this window and try again.");
        return;
    }
    if (!win.opener) {
        fail("Return to the app that opened this window and try again.");
        return;
    }
    // Only what Auth0 sends back. A token typed into the callback URL must not reach the dapp as if Auth0 issued it.
    let response = { state: decoded.s };
    for (const name of ["code", "error", "error_description"]) {
        const value = params.get(name);
        if (value !== null) response[name] = value;
    }
    const key = VERIFIER_KEY + states[0];
    let verifier = null;
    try {
        verifier = win.sessionStorage.getItem(key);
        win.sessionStorage.removeItem(key);
    } catch {
        // Storage is blocked, so these pages kept no verifier.
    }
    if (verifier) {
        if (typeof response.code === "string") {
            const tokens = await redeemCode(win, response.code, verifier);
            response = tokens ? { state: decoded.s, ...tokens } : { state: decoded.s, error: "token_exchange_failed" };
        }
    }
    win.opener.postMessage({ type: "authorization_response", response }, decoded.o);
    win.close();
}
