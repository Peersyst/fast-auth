import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dockerfile = readFileSync(resolve(__dirname, "../../../../../docker/console-web.Dockerfile"), "utf8");
const conf = dockerfile.split("COPY <<EOF /etc/nginx/conf.d/default.conf\n")[1].split("\nEOF\n")[0];

/**
 * Finds the body of a `{ ... }` block that follows a header.
 * @param text The text to search.
 * @param header The text before the opening brace.
 * @returns The body, between the braces.
 */
function blockBody(text: string, header: string): string {
    const open = text.indexOf("{", text.indexOf(header));
    let depth = 0;
    for (let i = open; i < text.length; i++) {
        if (text[i] === "{") depth++;
        if (text[i] === "}" && --depth === 0) return text.slice(open + 1, i);
    }
    throw new Error(`unterminated block: ${header}`);
}

/**
 * Reads the `add_header` directives of a block, outside any nested block.
 * @param body The block body.
 * @returns The header values by name.
 */
function headers(body: string): Record<string, string> {
    return Object.fromEntries([...body.matchAll(/^\s*add_header\s+(\S+)\s+"([^"]*)"/gm)].map((m) => [m[1], m[2]]));
}

const server = blockBody(conf, "server");
const loginLocation = blockBody(server, "location /login/");
const serverHeaders = headers(server.replace(loginLocation, "").replace(blockBody(server, "location /"), ""));
const loginHeaders = headers(loginLocation);

describe("console-web nginx /login/ location", () => {
    it("should find the server level headers", () => {
        expect(Object.keys(serverHeaders)).toEqual([
            "Content-Security-Policy",
            "Cross-Origin-Opener-Policy",
            "Cross-Origin-Resource-Policy",
            "Origin-Agent-Cluster",
            "Referrer-Policy",
            "Strict-Transport-Security",
            "X-Content-Type-Options",
            "X-Frame-Options",
        ]);
    });

    it("should repeat every server level header except COOP with the same value", () => {
        const { "Cross-Origin-Opener-Policy": _coop, ...inherited } = serverHeaders;
        expect(loginHeaders).toMatchObject(inherited);
    });

    it("should let a popup opened by another origin keep its opener", () => {
        expect(loginHeaders["Cross-Origin-Opener-Policy"]).toBe("unsafe-none");
    });

    it("should not log the callback URL or cache it", () => {
        expect(loginLocation).toMatch(/^\s*access_log off;/m);
        expect(loginHeaders["Cache-Control"]).toBe("no-store");
    });

    it("should accept a login page URL that carries a signing payload", () => {
        expect(server).toMatch(/^\s*large_client_header_buffers 4 32k;$/m);
    });

    it("should answer a missing file with 404 instead of the app", () => {
        expect(loginLocation).toMatch(/try_files \\\$uri \\\$uri\/ =404;/);
    });
});
