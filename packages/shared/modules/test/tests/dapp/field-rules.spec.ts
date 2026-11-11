import {
    isCallbackUrl,
    isLogoUrl,
    isValidDescription,
    isValidName,
    isValidUrlList,
    isWebOrigin,
    normaliseUrlList,
    UrlListField,
} from "../../../src/dapp";

type SingleValueRule = "callbackUrl" | "webOrigin" | "logoUrl" | "name" | "description";

type Vectors<T> = { valid: T[]; invalid: T[] };

/**
 * Builds numbered URLs, counting from 1.
 * @param count How many URLs to build.
 * @param url Builds the URL for a number.
 * @returns The URLs.
 */
const urls = (count: number, url: (i: number) => string): string[] => Array.from({ length: count }, (_, i) => url(i + 1));

/**
 * Builds an https URL of an exact length on acme.xyz.
 * @param length The URL's length.
 * @returns The URL.
 */
const urlOfLength = (length: number): string => `https://acme.xyz/${"a".repeat(length - "https://acme.xyz/".length)}`;

const SINGLE_VALUE_VECTORS: Record<SingleValueRule, Vectors<string>> = {
    callbackUrl: {
        valid: [
            "https://app.example.com/callback",
            "  HTTPS://APP.Example.COM/Callback  ",
            "https://app.example.com:8443/callback",
            "https://my_app.example.com/callback",
            urlOfLength(2048),
        ],
        invalid: [
            "app.example.com/callback",
            "http://app.example.com/callback",
            "https://user@app.example.com/callback",
            "https://app.example.com/callback#token",
            "https://*.example.com/callback",
            "https://127.0.0.1/callback",
            "https://localhost/callback",
            "https://app.example.com:99999/callback",
            "https://bücher.ch/callback",
            "https://app.example.com/call back",
            "https://acme.xyz/\u0001",
            "https://acme.xyz/a\\b",
            "https://xn--a.xyz/callback",
            urlOfLength(2049),
        ],
    },
    webOrigin: {
        valid: ["https://app.example.com", "https://app.example.com:8443"],
        invalid: [
            "https://app.example.com/",
            "https://app.example.com?query=1",
            "https://app.example.com#fragment",
            "http://app.example.com",
            "https://127.0.0.1",
            "https://user@app.example.com",
        ],
    },
    logoUrl: {
        valid: ["https://cdn.example.com/logo.png", "https://cdn.example.com#logo", `https://cdn.example.com/${"a".repeat(231)}`],
        invalid: ["http://cdn.example.com/logo.png", "https://localhost/logo.png", `https://cdn.example.com/${"a".repeat(232)}`],
    },
    name: {
        valid: ["Acme Wallet", "Acme \u{1F468}‍\u{1F4BB}", "a".repeat(64)],
        invalid: ["   ", "a".repeat(65), "Acme <b>", "Acme\u0001"],
    },
    description: {
        valid: ["", "Line one\r\nLine two\twith a tab", "a".repeat(140)],
        invalid: ["a".repeat(141), "Acme\u0001"],
    },
};

const LIST_VECTORS: Record<UrlListField, Vectors<string[]>> = {
    callbackUrls: {
        valid: [[...urls(10, (i) => `https://app.example.com/cb${i}`), "https://APP.EXAMPLE.COM/cb1"]],
        invalid: [[], urls(11, (i) => `https://app.example.com/cb${i}`), ["https://app.example.com/callback#token"]],
    },
    logoutUrls: {
        valid: [[]],
        invalid: [urls(11, (i) => `https://app.example.com/logout${i}`), ["https://app.example.com/#logout"]],
    },
    webOrigins: {
        valid: [["https://app.example.com"]],
        invalid: [[], urls(11, (i) => `https://app${i}.example.com`), ["https://app.example.com/"]],
    },
};

const NORMALISE_URL_LIST_VECTORS: { input: string[]; output: string[] }[] = [
    { input: [" https://APP.Example.com/Callback?Next=A "], output: ["https://app.example.com/Callback?Next=A"] },
    {
        input: ["https://app.example.com/cb", "HTTPS://APP.EXAMPLE.COM/cb", "https://app.example.com/CB"],
        output: ["https://app.example.com/cb", "https://app.example.com/CB"],
    },
    { input: ["  Not A URL  "], output: ["Not A URL"] },
];

describe("field rules", () => {
    describe.each<[SingleValueRule, (value: string) => boolean]>([
        ["callbackUrl", isCallbackUrl],
        ["webOrigin", isWebOrigin],
        ["logoUrl", isLogoUrl],
        ["name", isValidName],
        ["description", isValidDescription],
    ])("%s", (rule, isValid) => {
        it.each(SINGLE_VALUE_VECTORS[rule].valid)("should accept %j", (value) => {
            expect(isValid(value)).toBe(true);
        });

        it.each(SINGLE_VALUE_VECTORS[rule].invalid)("should refuse %j", (value) => {
            expect(isValid(value)).toBe(false);
        });
    });

    describe.each<UrlListField>(["callbackUrls", "logoutUrls", "webOrigins"])("isValidUrlList %s", (field) => {
        it.each(LIST_VECTORS[field].valid.map((list) => [list]))("should accept %j", (list) => {
            expect(isValidUrlList(field, list)).toBe(true);
        });

        it.each(LIST_VECTORS[field].invalid.map((list) => [list]))("should refuse %j", (list) => {
            expect(isValidUrlList(field, list)).toBe(false);
        });
    });

    describe("normaliseUrlList", () => {
        it.each(NORMALISE_URL_LIST_VECTORS)("should normalise $input", ({ input, output }) => {
            expect(normaliseUrlList(input)).toEqual(output);
        });
    });
});
