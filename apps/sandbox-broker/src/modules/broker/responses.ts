import { randomBytes } from "crypto";
import type { Request, Response } from "express";
import { DappReturn } from "./broker.types";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/**
 * Embeds a value in an inline script. `<` is escaped so that a dApp's state can never close the script tag.
 * @param value The value.
 * @returns The JSON text.
 */
const scriptJson = (value: unknown): string => JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * Answers the dApp: by redirect to its redirect URI, or by `postMessage` to the window that opened the sign-in.
 * @param res The response.
 * @param dapp Where and how to answer.
 * @param params A code, or an OAuth error.
 */
export function deliver(res: Response, dapp: DappReturn, params: Record<string, string>): void {
    const response = dapp.state ? { ...params, state: dapp.state } : params;
    if (dapp.responseMode === "web_message") {
        renderWebMessage(res, dapp.origin, response);
        return;
    }
    const url = new URL(dapp.redirectUri);
    for (const [name, value] of Object.entries(response)) url.searchParams.set(name, value);
    res.redirect(302, url.toString());
}

/**
 * Renders the page that posts the answer to the dApp, the way Auth0's `response_mode=web_message` does.
 * It posts to the popup's opener, or to the parent of a hidden iframe, and only to the dApp's origin, so no other page
 * can read it.
 * @param res The response.
 * @param origin The dApp's origin.
 * @param response The message's `response`.
 */
export function renderWebMessage(res: Response, origin: string, response: Record<string, string>): void {
    const nonce = randomBytes(16).toString("base64");
    res.setHeader("Content-Security-Policy", `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors ${origin}`);
    res.type("html").send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Signing in</title></head><body>` +
            `<script nonce="${nonce}">(window.opener || window.parent).postMessage(` +
            `{ type: "authorization_response", response: ${scriptJson(response)} }, ${scriptJson(origin)});</script>` +
            `</body></html>`,
    );
}

/**
 * Renders a plain page with a message, for when there is nowhere to send the user.
 * @param res The response.
 * @param status The HTTP status.
 * @param message The message.
 */
export function renderPage(res: Response, status: number, message: string): void {
    const text = message.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
    res.status(status)
        .type("html")
        .send(
            `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>NEAR Auth sandbox</title></head>` +
                `<body><p>${text}</p></body></html>`,
        );
}

/**
 * Reads a cookie from the request.
 * @param req The request.
 * @param name The cookie's name.
 * @returns Its value, or undefined.
 */
export function readCookie(req: Request, name: string): string | undefined {
    for (const pair of (req.headers.cookie ?? "").split(";")) {
        const separator = pair.indexOf("=");
        if (separator > 0 && pair.slice(0, separator).trim() === name) {
            try {
                return decodeURIComponent(pair.slice(separator + 1).trim());
            } catch {
                return undefined;
            }
        }
    }
    return undefined;
}
