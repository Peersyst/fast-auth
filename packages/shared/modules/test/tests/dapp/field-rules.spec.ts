import {
    isCallbackUrl,
    isContactEmail,
    isLogoUrl,
    isValidDescription,
    isValidName,
    isValidUrlList,
    isWebOrigin,
    normaliseUrlList,
    UrlListField,
} from "../../../src/dapp";

type SingleValueRule = "callbackUrl" | "webOrigin" | "logoUrl" | "name" | "description" | "contactEmail";

type Vectors<T> = { valid: T[]; invalid: T[] };

/**
 * Builds numbered URLs, counting from 1.
 * @param count How many URLs to build.
 * @param url Builds the URL for a number.
 * @returns The URLs.
 */
const urls = (count: number, url: (i: number) => string): string[] => Array.from({ length: count }, (_, i) => url(i + 1));

const SINGLE_VALUE_VECTORS: Record<SingleValueRule, Vectors<string>> = {
    callbackUrl: {
        valid: [
            "https://app.example.com/callback",
            "https://example.com",
            "https://example.com/",
            "https://app.example.com:8443/auth/callback?next=%2Fhome",
            "https://APP.Example.COM/Callback",
            "HTTPS://app.example.com/cb",
            "  https://app.example.com/cb  ",
            "https://example.com./cb",
            "https://xn--bcher-kva.ch/cb",
            "https://localhost.example.com/cb",
            "https://123.example.com/cb",
            "https://app.example.com?next=%2Fhome",
            "https://app.mylocal/cb",
        ],
        invalid: [
            "",
            "   ",
            "app.example.com/callback",
            "/callback",
            "http://app.example.com/callback",
            "ftp://app.example.com/callback",
            "com.example.app://callback",
            "https:app.example.com/callback",
            "https:/app.example.com/callback",
            "https:///app.example.com/callback",
            "https://",
            "https://user@app.example.com/callback",
            "https://user:secret@app.example.com/callback",
            "https://@app.example.com/callback",
            "https://app.example.com/callback#token",
            "https://app.example.com/callback#",
            "https://*.example.com/callback",
            "https://app*.example.com/callback",
            "https://%2a.example.com/callback",
            "https://127.0.0.1/callback",
            "https://10.0.0.1:8443/callback",
            "https://127.1/callback",
            "https://0x7f000001/callback",
            "https://[::1]/callback",
            "https://[2001:db8::1]:8443/callback",
            "https://localhost/callback",
            "https://localhost:3000/callback",
            "https://LOCALHOST/callback",
            "https://localhost./callback",
            "https://app.example.com:99999/callback",
            "https://bücher.ch/callback",
            "https://app.example.com/call back",
            "https://app.example.com/call\tback",
            "https://app.example.com\\callback",
            "https://app example.com/callback",
        ],
    },
    webOrigin: {
        valid: [
            "https://app.example.com",
            "https://example.com",
            "https://app.example.com:8443",
            "https://APP.Example.COM",
            " https://app.example.com ",
            "https://xn--bcher-kva.ch",
        ],
        invalid: [
            "",
            "app.example.com",
            "http://app.example.com",
            "https://app.example.com/",
            "https://app.example.com/path",
            "https://app.example.com?query=1",
            "https://app.example.com?",
            "https://app.example.com#fragment",
            "https://app.example.com#",
            "https://user@app.example.com",
            "https://*.example.com",
            "https://*",
            "https://127.0.0.1",
            "https://[::1]",
            "https://[2001:db8::1]:8443",
            "https://localhost",
            "https://localhost:8443",
            "https://app.example.com:443",
            "https://app.example.com:",
            "https://app.example.com:99999",
            "https://bücher.ch",
        ],
    },
    logoUrl: {
        valid: [
            "https://cdn.example.com/logo.png",
            "https://cdn.example.com/logo.svg?v=2",
            "https://CDN.Example.com/Logo.png",
            "https://cdn.example.com:8443/logo.png",
            `https://cdn.example.com/${"a".repeat(231)}`,
            `  https://cdn.example.com/${"a".repeat(231)}  `,
            "https://cdn.example.com#logo",
        ],
        invalid: [
            "",
            "cdn.example.com/logo.png",
            "http://cdn.example.com/logo.png",
            "data:image/png;base64,iVBORw0KGgo=",
            "https://user:secret@cdn.example.com/logo.png",
            "https://cdn.example.com/my logo.png",
            `https://cdn.example.com/${"a".repeat(232)}`,
        ],
    },
    name: {
        valid: ["A", "Acme", "Acme Wallet", "Acme & Co. — Wallet", "  Acme  ", "a".repeat(64)],
        invalid: ["", "   ", "a".repeat(65), "<script>", "Acme <b>", "a > b", "a < b", "Acme\u0000Wallet"],
    },
    description: {
        valid: ["", "A wallet for NEAR.", "Fees < 1% & fast > slow", "a".repeat(140)],
        invalid: ["a".repeat(141), "A wallet\u0000 for NEAR."],
    },
    contactEmail: {
        valid: [
            "dev@acme.xyz",
            "dev@near-acme.xyz",
            "Dev.Team+near@acme.co.uk",
            "first_last@sub.acme.io",
            "dev2@web3.xyz",
            "dev-team@acme.xyz",
            "o'brien@acme.xyz",
            "dev'@acme.xyz",
            "dev@acme.xn--p1ai",
            "dev@ACME.XN--P1AI",
        ],
        invalid: [
            "",
            "acme.xyz",
            "dev@",
            "@acme.xyz",
            "dev@acme",
            "dev@acme-.xyz",
            "dev@acme.c",
            "dev@acme.12",
            "dev@localhost",
            "dev @acme.xyz",
            "dev@@acme.xyz",
            ".dev@acme.xyz",
            "dev..team@acme.xyz",
            "dev@[127.0.0.1]",
        ],
    },
};

const LIST_VECTORS: Record<UrlListField, Vectors<string[]>> = {
    callbackUrls: {
        valid: [
            ["https://app.example.com/callback"],
            ["https://app.example.com/callback", "https://app.example.com/silent"],
            ["https://app.example.com/callback", "https://APP.example.com/callback"],
            urls(10, (i) => `https://app.example.com/cb${i}`),
            [...urls(10, (i) => `https://app.example.com/cb${i}`), "https://APP.EXAMPLE.COM/cb1"],
        ],
        invalid: [
            [],
            [""],
            urls(11, (i) => `https://app.example.com/cb${i}`),
            ["https://app.example.com/callback", "https://localhost/callback"],
            ["https://app.example.com/callback#token"],
        ],
    },
    logoutUrls: {
        valid: [[], ["https://app.example.com/"], urls(10, (i) => `https://app.example.com/logout${i}`)],
        invalid: [urls(11, (i) => `https://app.example.com/logout${i}`), ["https://app.example.com/#logout"]],
    },
    webOrigins: {
        valid: [
            ["https://app.example.com"],
            ["https://app.example.com", "https://APP.example.com"],
            urls(10, (i) => `https://app${i}.example.com`),
        ],
        invalid: [[], urls(11, (i) => `https://app${i}.example.com`), ["https://app.example.com/"]],
    },
};

const NORMALISE_URL_LIST_VECTORS: { input: string[]; output: string[] }[] = [
    { input: [], output: [] },
    { input: [" https://APP.Example.com/Callback?Next=A "], output: ["https://app.example.com/Callback?Next=A"] },
    {
        input: ["https://app.example.com/cb", "HTTPS://APP.EXAMPLE.COM/cb", "https://app.example.com/CB"],
        output: ["https://app.example.com/cb", "https://app.example.com/CB"],
    },
    { input: ["https://app.example.com", "https://app.example.com/"], output: ["https://app.example.com", "https://app.example.com/"] },
    { input: ["  Not A URL  "], output: ["Not A URL"] },
];

describe("field rules", () => {
    describe.each<[SingleValueRule, (value: string) => boolean]>([
        ["callbackUrl", isCallbackUrl],
        ["webOrigin", isWebOrigin],
        ["logoUrl", isLogoUrl],
        ["name", isValidName],
        ["description", isValidDescription],
        ["contactEmail", isContactEmail],
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

    describe("edge cases", () => {
        it.each([
            ["a line break", "Acme\n*Contact:* x"],
            ["a control character", "Acme\u0001"],
        ])("should refuse a name with %s", (_case, name) => {
            expect(isValidName(name)).toBe(false);
        });

        it("should keep names with joined emoji and non-Latin scripts", () => {
            expect(isValidName("Acme \u{1F468}\u200D\u{1F4BB}")).toBe(true);
            expect(isValidName("\u0645\u062B\u0627\u0644")).toBe(true);
            expect(isValidName("\u{1F680}")).toBe(true);
        });

        it("should keep line breaks in a description and refuse other control characters", () => {
            expect(isValidDescription("Line one\nLine two\twith a tab")).toBe(true);
            expect(isValidDescription("Line one\r\nLine two")).toBe(true);
            expect(isValidDescription("a\u000Bb")).toBe(false);
            expect(isValidDescription("a\u000Cb")).toBe(false);
            expect(isValidDescription("Acme\u0001")).toBe(false);
        });

        it.each([
            ["a control character", "https://acme.xyz/\u0001"],
            ["a delete character", "https://acme.xyz/\u007F"],
            ["a backslash in the path", "https://acme.xyz/a\\b"],
            ["a single-label host", "https://intranet/callback"],
            ["an empty host label", "https://acme..xyz/callback"],
            ["a label starting with a hyphen", "https://-acme.xyz/callback"],
            ["a label ending with a hyphen", "https://acme-.xyz/callback"],
            ["2049 characters", `https://acme.xyz/${"a".repeat(2049 - "https://acme.xyz/".length)}`],
        ])("should refuse a callback URL with %s", (_case, url) => {
            expect(isCallbackUrl(url)).toBe(false);
        });

        it("should keep a callback URL of exactly 2048 characters and one on a host with an underscore", () => {
            expect(isCallbackUrl(`https://acme.xyz/${"a".repeat(2048 - "https://acme.xyz/".length)}`)).toBe(true);
            expect(isCallbackUrl("https://my_app.acme.xyz/callback")).toBe(true);
            expect(isCallbackUrl("https://_app.acme.xyz/callback")).toBe(true);
            expect(isCallbackUrl("https://app_.acme.xyz/callback")).toBe(true);
        });

        it.each([
            "https://localhost/logo.png",
            "https://127.0.0.1/logo.png",
            "https://169.254.169.254/logo.png",
            "https://[::1]/logo.png",
            "https://cdn/logo.png",
        ])("should refuse a logo on a host that is not public: %s", (url) => {
            expect(isLogoUrl(url)).toBe(false);
        });

        it("should cap a contact email at 254 characters", () => {
            const domain = (lastLabel: number): string => `${"b".repeat(63)}.${"b".repeat(63)}.${"b".repeat(lastLabel)}.com`;

            expect(isContactEmail(`${"a".repeat(64)}@${domain(57)}`)).toBe(true);
            expect(isContactEmail(`${"a".repeat(64)}@${domain(58)}`)).toBe(false);
        });
    });
});
