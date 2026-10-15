import { describe, expect, it } from "vitest";
import { dappFormSchema, type DappFormInput } from "./dapp-schema";

const URL_REASON = "Enter an https URL on a public host, without a #fragment or credentials.";
const ORIGIN_REASON = "Enter an https origin on a public host, like https://app.example.com, with no path or trailing slash.";

const VALID: DappFormInput = {
    name: "Acme Wallet",
    description: "",
    logoUrl: "https://cdn.acme.xyz/logo.png#v2",
    mauBracket: "lt1k",
    callbackUrls: [{ value: "https://app.acme.xyz/callback" }],
    logoutUrls: [{ value: "https://app.acme.xyz/bye" }],
    webOrigins: [{ value: "https://app.acme.xyz" }],
    contactEmail: "dev@acme.xyz",
};

const rows = (...values: string[]) => values.map((value) => ({ value }));

describe("dApp form schema", () => {
    it("accepts a valid form", () => {
        expect(dappFormSchema.safeParse(VALID).success).toBe(true);
    });

    it.each<[string, Partial<DappFormInput>, (string | number)[], string]>([
        [
            "a name with a zero-width space",
            { name: "Acme​Wallet" },
            ["name"],
            "Enter a name of at most 64 characters (most emoji count as two or more), with no < or > and no hidden or private-use characters.",
        ],
        [
            "a description with a direction override",
            { description: "Fast‮wallet" },
            ["description"],
            "Use at most 140 characters (most emoji count as two or more). Tabs and line breaks are fine, but not other control characters or direction embedding, override or isolate characters.",
        ],
        [
            "a logo on a .local host",
            { logoUrl: "https://printer.local/logo.png" },
            ["logoUrl"],
            "Enter an https URL on a public host, of at most 255 characters.",
        ],
        [
            "a callback URL on a .local host",
            { callbackUrls: rows("https://printer.local/callback") },
            ["callbackUrls", 0, "value"],
            URL_REASON,
        ],
        ["a logout URL with a #fragment", { logoutUrls: rows("https://app.acme.xyz/bye#now") }, ["logoutUrls", 0, "value"], URL_REASON],
        ["a web origin on a home.arpa host", { webOrigins: rows("https://router.home.arpa") }, ["webOrigins", 0, "value"], ORIGIN_REASON],
        [
            "eleven callback URLs",
            { callbackUrls: rows(...Array.from({ length: 11 }, (_, index) => `https://app.acme.xyz/cb${index}`)) },
            ["callbackUrls"],
            "Add 1 to 10 callback URLs, each an https URL on a public host, without a #fragment or credentials.",
        ],
        [
            "no web origin",
            { webOrigins: [] },
            ["webOrigins"],
            "Add 1 to 10 web origins, each an https origin on a public host, like https://app.example.com, with no path or trailing slash.",
        ],
        ["a 255-character email", { contactEmail: `${"a".repeat(246)}@acme.xyz` }, ["contactEmail"], "Enter a valid email address."],
    ])("refuses %s", (_, override, path, message) => {
        const result = dappFormSchema.safeParse({ ...VALID, ...override });

        expect(result.error?.issues.map((issue) => ({ path: issue.path, message: issue.message }))).toEqual([{ path, message }]);
    });

    it("outputs the normalised values the API stores", () => {
        const result = dappFormSchema.parse({
            name: "  Acme  ",
            description: " A wallet. ",
            logoUrl: " https://CDN.Example.com/Logo.png ",
            mauBracket: "lt1k",
            callbackUrls: rows("https://APP.example.com/cb", "https://app.example.com/cb "),
            logoutUrls: [],
            webOrigins: rows("HTTPS://App.Example.com"),
            contactEmail: " dev@acme.xyz ",
        });

        expect(result).toEqual({
            name: "Acme",
            description: "A wallet.",
            logoUrl: "https://cdn.example.com/Logo.png",
            mauBracket: "lt1k",
            callbackUrls: ["https://app.example.com/cb"],
            logoutUrls: [],
            webOrigins: ["https://app.example.com"],
            contactEmail: "dev@acme.xyz",
        });
    });
});
