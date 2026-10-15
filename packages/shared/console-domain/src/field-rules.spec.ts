import type { UrlListField } from "./field-rules";
import {
    isContactEmail,
    isCallbackUrl,
    isLogoUrl,
    isValidDescription,
    isValidName,
    isValidUrlList,
    isWebOrigin,
    normaliseUrlList,
} from "./field-rules";

type SingleValueRule = "callbackUrl" | "webOrigin" | "logoUrl" | "name" | "description" | "contactEmail";

const SINGLE_VALUE_RULES: [SingleValueRule, (value: string) => boolean][] = [
    ["callbackUrl", isCallbackUrl],
    ["webOrigin", isWebOrigin],
    ["logoUrl", isLogoUrl],
    ["name", isValidName],
    ["description", isValidDescription],
    ["contactEmail", isContactEmail],
];

const LIST_RULES: UrlListField[] = ["callbackUrls", "logoutUrls", "webOrigins"];

type Vectors<T> = { valid: T[]; invalid: T[] };

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
            "https://app.localhost/callback",
            "https://printer.local/callback",
            "https://printer.local./callback",
            "https://metadata.google.internal/callback",
            "https://nas.lan/callback",
            "https://router.home/callback",
            "https://intranet.corp/callback",
            "https://router.home.arpa/callback",
            "https://localhost.localdomain/callback",
            "https://home.arpa/callback",
            "https://app.test/callback",
            "https://app.invalid/callback",
            "https://app.example/callback",
            "https://app.example.com:443/callback",
            "https://app.example.com:/callback",
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
            "https://printer.local",
            "https://metadata.google.internal",
            "https://nas.lan",
            "https://router.home",
            "https://intranet.corp",
            "https://router.home.arpa",
            "https://app.test",
            "https://app.invalid",
            "https://app.example",
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
        valid: ["A", "Acme", "Acme Wallet", "Acme & Co. — Wallet", "  Acme  ", "a".repeat(64), ` ${"a".repeat(64)} `],
        invalid: ["", "   ", "a".repeat(65), "<script>", "Acme <b>", "a > b", "a < b", "Acme\u0000Wallet"],
    },
    description: {
        valid: ["", "A wallet for NEAR.", "Fees < 1% & fast > slow", "a".repeat(140), ` ${"a".repeat(140)} `],
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
            "  dev@acme.xyz  ",
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

describe.each(SINGLE_VALUE_RULES)("%s", (key, isValid) => {
    const { valid, invalid } = SINGLE_VALUE_VECTORS[key];

    it.each(valid)("accepts %j", (value) => {
        expect(isValid(value)).toBe(true);
    });

    it.each(invalid)("refuses %j", (value) => {
        expect(isValid(value)).toBe(false);
    });
});

describe.each(LIST_RULES)("%s", (field) => {
    const { valid, invalid } = LIST_VECTORS[field];

    it.each(valid.map((list) => [list]))("accepts %j", (list) => {
        expect(isValidUrlList(field, list)).toBe(true);
    });

    it.each(invalid.map((list) => [list]))("refuses %j", (list) => {
        expect(isValidUrlList(field, list)).toBe(false);
    });
});

describe("edge cases", () => {
    it.each([
        ["a line break", "Acme\n*Contact:* x"],
        ["a direction override", "Acme\u202Etellaw"],
        ["a control character", "Acme\u0001"],
        ["a lone surrogate", "Acme\uD800"],
        ["only invisible characters", "\u200B"],
        ["a zero-width space", "Acme\u200B"],
        ["a byte order mark", "Ac\uFEFFme"],
        ["a line separator", "Acme\u2028Contact"],
        ["a paragraph separator", "Acme\u2029x"],
        ["only a braille blank", "\u2800"],
        ["only braille blanks and a space", "\u2800 \u2800"],
        ["a braille blank after the text", "Acme\u2800"],
        ["a braille blank between words", "Acme\u2800Wallet"],
        ["only Hangul fillers", "\u3164\u115F\u1160\uFFA0"],
        ["only a zero-width joiner", "\u200D"],
        ["only a variation selector", "\uFE0F"],
        ["only a combining mark", "\u0300"],
        ["only a private-use character", "\uE000"],
        ["a private-use character next to letters", "Acme\uF8FF"],
        ["only musical null noteheads", "\u{1D159}\u{1D159}"],
        ["a word joiner", "Acme\u2060x"],
        ["a soft hyphen", "Ac\u00ADme"],
        ["a format character that is not default-ignorable", "Acme\uFFF9"],
        ["a right-to-left mark", "Acme\u200F"],
        ["an invisible operator", "Acme\u2062"],
        ["a language tag", "Acme\u{E0001}"],
        ["tag characters spelling text", "Acme\u{E0069}\u{E0067}\u{E006E}\u{E006F}\u{E0072}\u{E0065}"],
        ["a black flag carrying tags that name no RGI flag", "\u{1F3F4}\u{E0075}\u{E0073}\u{E0074}\u{E0078}\u{E007F}"],
        ["a run of ideographic variation selectors", `Acme${"\u{E0100}".repeat(20)}`],
        ["a variation selector after a letter", "Acme\uFE0F"],
        ["a presentation selector after a digit", "Acme1\uFE0F"],
        ["two variation selectors after an emoji", "\u2764\uFE0F\uFE0F"],
        ["two ideographic variation selectors after an ideograph", "\u845B\u{E0100}\u{E0101}"],
        ["a run of zero-width joiners", "Ac\u200D\u200D\u200D\u200D\u200Dme"],
        ["a zero-width joiner between Latin letters", "Ac\u200Dme"],
        ["a zero-width joiner after an emoji", "\u{1F680}\u200D"],
        ["a zero-width joiner after a combining mark at the end", "\u0DC1\u0DCA\u200D"],
        ["a zero-width non-joiner at the end", "Acme\u200C"],
        ["two zero-width non-joiners", "\u0645\u06CC\u200C\u200C\u062E"],
        ["a combining grapheme joiner", "Acme\u034F"],
        ["a Hangul filler between letters", "Ac\u3164me"],
    ])("refuses a name with %s", (_case, name) => {
        expect(isValidName(name)).toBe(false);
    });

    it("keeps names with joined emoji and non-Latin scripts", () => {
        expect(isValidName("Acme \u{1F468}\u200D\u{1F4BB}")).toBe(true);
        expect(isValidName("\u0645\u062B\u0627\u0644")).toBe(true);
        expect(isValidName("\u{1F680}")).toBe(true);
        expect(isValidName("\u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u0645")).toBe(true);
        expect(isValidName("\u{1F1EA}\u{1F1F8} Wallet")).toBe(true);
        expect(isValidName("1\uFE0F\u20E3")).toBe(true);
        expect(isValidName("#\uFE0F\u20E3 *\uFE0F\u20E3")).toBe(true);
        expect(isValidName("\u6771\u4EAC")).toBe(true);
        expect(isValidName("\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}")).toBe(true);
        expect(isValidName("\u{1F469}\u{1F3FD}\u200D\u{1F4BB} \u2764\uFE0F\u200D\u{1F525} \u263A\uFE0E")).toBe(true);
        expect(isValidName("\u0DC1\u0DCA\u200D\u0DBB\u0DD3 Wallet")).toBe(true);
        expect(isValidName("\u845B\u{E0100}\u98FE\u533A")).toBe(true);
        expect(isValidName("\u6F22\uFE00\u5B57\uFE0D")).toBe(true);
        expect(isValidName("\u0915\u094D\u200C\u0937")).toBe(true);
        expect(isValidName("\u09B0\u200D\u09CD\u09AF\u09BE\u09AC")).toBe(true);
        expect(
            isValidName(
                "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
            ),
        ).toBe(true);
    });

    it("keeps line breaks in a description and refuses overrides, controls and lone surrogates", () => {
        expect(isValidDescription("Line one\nLine two\twith a tab")).toBe(true);
        expect(isValidDescription("Line one\r\nLine two")).toBe(true);
        expect(isValidDescription("Acme\u202Etellaw")).toBe(false);
        expect(isValidDescription("Acme\u2066x")).toBe(false);
        expect(isValidDescription("Acme\u202Ax")).toBe(false);
        expect(isValidDescription("Acme\u2069x")).toBe(false);
        expect(isValidDescription("a\u000Bb")).toBe(false);
        expect(isValidDescription("a\u000Cb")).toBe(false);
        expect(isValidDescription("Acme\u0001")).toBe(false);
        expect(isValidDescription("Acme\uDC00")).toBe(false);
    });

    it.each([
        ["a control character", "https://acme.xyz/\u0001"],
        ["a delete character", "https://acme.xyz/\u007F"],
        ["a backslash in the path", "https://acme.xyz/a\\b"],
        ["a direction override in the path", "https://evil.io/\u202Emoc.elpmaxe"],
        ["a zero-width space in the path", "https://acme.xyz/\u200Bcallback"],
        ["a lone surrogate", "https://acme.xyz/\uD800"],
        ["a single-label host", "https://intranet/callback"],
        ["an empty host label", "https://acme..xyz/callback"],
        ["a label starting with a hyphen", "https://-acme.xyz/callback"],
        ["a label ending with a hyphen", "https://acme-.xyz/callback"],
        ["2049 characters", `https://acme.xyz/${"a".repeat(2049 - "https://acme.xyz/".length)}`],
    ])("refuses a callback URL with %s", (_case, url) => {
        expect(isCallbackUrl(url)).toBe(false);
    });

    it("keeps a callback URL of exactly 2048 characters and one on a host with an underscore", () => {
        expect(isCallbackUrl(`https://acme.xyz/${"a".repeat(2048 - "https://acme.xyz/".length)}`)).toBe(true);
        expect(isCallbackUrl("https://my_app.acme.xyz/callback")).toBe(true);
        expect(isCallbackUrl("https://_app.acme.xyz/callback")).toBe(true);
        expect(isCallbackUrl("https://app_.acme.xyz/callback")).toBe(true);
    });

    it.each([
        "https://localhost/logo.png",
        "https://app.localhost./logo.png",
        "https://127.0.0.1/logo.png",
        "https://169.254.169.254/logo.png",
        "https://[::1]/logo.png",
        "https://cdn/logo.png",
        "https://router.home.arpa/logo.png",
        "https://printer.local/logo.png",
    ])("refuses a logo on a host that is not public: %s", (url) => {
        expect(isLogoUrl(url)).toBe(false);
    });

    it("caps a contact email at 254 characters", () => {
        expect(isContactEmail(`${"a".repeat(64)}@${"b".repeat(185)}.com`)).toBe(true);
        expect(isContactEmail(`${"a".repeat(64)}@${"b".repeat(186)}.com`)).toBe(false);
    });
});

describe("normaliseUrlList", () => {
    it.each(NORMALISE_URL_LIST_VECTORS)("normalises $input", ({ input, output }) => {
        expect(normaliseUrlList(input)).toEqual(output);
    });
});
