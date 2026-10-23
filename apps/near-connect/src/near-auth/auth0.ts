import { sha256 } from "@noble/hashes/sha2";

import { dappOrigin } from "./config";

// Not @auth0/auth0-spa-js, which needs a real popup handle and an origin that the sandbox lacks.

const PKCE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

const POPUP_WIDTH = 480;
const POPUP_HEIGHT = 720;

interface Auth0Tokens {
    accessToken: string;
    idToken: string;
}

interface AuthorizeParams {
    scope: string;
    audience?: string;
    extraParams?: Record<string, string>;
    popupBlockedPrompt: { title: string; button: string };
    prompt?: "login";
}

const randomString = (length: number): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, (byte) => PKCE_CHARSET[byte % PKCE_CHARSET.length]).join("");
};

const base64UrlEncode = (bytes: Uint8Array): string => {
    let binary = "";
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const decodeJwt = <T>(token: string): T => {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
};

const popupFeatures = () => {
    const left = window.selector.screenX + (window.selector.outerWidth - POPUP_WIDTH) / 2;
    const top = window.selector.screenY + (window.selector.outerHeight - POPUP_HEIGHT) / 2;
    return `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},top=${top},left=${left},resizable,scrollbars=yes,status=1`;
};

const requestCode = async (url: string, state: string, popupBlockedPrompt: AuthorizeParams["popupBlockedPrompt"]): Promise<string> => {
    const popup = window.selector.open(url, "_blank", popupFeatures());

    // The browser blocked the popup, so ask for a click inside the sandbox and retry within its gesture.
    if (!(await popup.windowIdPromise)) {
        await window.selector.ui.whenApprove(popupBlockedPrompt);
        return await requestCode(url, state, popupBlockedPrompt);
    }

    try {
        return await new Promise<string>((resolve, reject) => {
            const stop = () => {
                window.removeEventListener("message", onMessage);
                clearInterval(closeWatcher);
            };

            const onMessage = (event: MessageEvent) => {
                const { type, response } = event.data ?? {};
                if (type !== "authorization_response" || response?.state !== state) return;

                stop();
                if (response.error) reject(new Error(response.error_description || response.error));
                else resolve(response.code);
            };

            const closeWatcher = setInterval(() => {
                if (!popup.closed) return;
                stop();
                reject(new Error("User closed the NEAR Auth window"));
            }, 300);

            window.addEventListener("message", onMessage);
        });
    } finally {
        popup.close();
    }
};

export const authorize = async (domain: string, clientId: string, params: AuthorizeParams): Promise<Auth0Tokens> => {
    const redirectUri = dappOrigin();
    const codeVerifier = randomString(64);
    const codeChallenge = base64UrlEncode(sha256(new TextEncoder().encode(codeVerifier)));
    const state = randomString(32);

    const url = new URL(`https://${domain}/authorize`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    // The sandbox cannot read the popup's url, so Auth0 posts the response to the dapp instead.
    url.searchParams.set("response_mode", "web_message");
    url.searchParams.set("scope", params.scope);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    if (params.audience) url.searchParams.set("audience", params.audience);
    if (params.prompt) url.searchParams.set("prompt", params.prompt);
    Object.entries(params.extraParams ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));

    const code = await requestCode(url.toString(), state, params.popupBlockedPrompt);

    const response = await fetch(`https://${domain}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            grant_type: "authorization_code",
            client_id: clientId,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
            code,
        }),
    }).catch(() => null);

    if (!response) throw new Error("NEAR Auth could not reach Auth0");

    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error_description || body.error || "NEAR Auth token exchange failed");

    return { accessToken: body.access_token, idToken: body.id_token };
};
