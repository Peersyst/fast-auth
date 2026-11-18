/**
 * @jest-environment node
 */
const { onExecutePostLogin, onContinuePostLogin, SCHEMA } = require("../src/actions/authorize-app.action.js");
const { serialize } = require("borsh");
const { buildTransaction, buildDelegateAction, buildAction, ALL_ACTION_TYPES, DELEGATE_ACTION_TYPES } = require("./fixtures/builders.js");

const ONCHAIN_AUDIENCE = "https://onchain.example";

function makeApi() {
    const calls = {
        deny: [],
        removedScopes: [],
        customClaims: {},
        render: null,
    };
    const api = {
        access: {
            deny: (msg) => {
                calls.deny.push(msg);
            },
        },
        accessToken: {
            removeScope: (s) => {
                calls.removedScopes.push(s);
            },
            setCustomClaim: (k, v) => {
                calls.customClaims[k] = v;
            },
        },
        prompt: {
            render: (modalId, opts) => {
                calls.render = { modalId, opts };
            },
        },
    };
    return { api, calls };
}

function makeEvent({ query = {}, audience = ONCHAIN_AUDIENCE } = {}) {
    return {
        secrets: {
            ONCHAIN_AUDIENCE,
            TRANSACTION_FORM: "modal_tx",
            DELEGATE_ACTION_FORM: "modal_delegate",
            NEP413_FORM: "modal_nep413",
        },
        request: { query },
        resource_server: { identifier: audience },
        client: { name: "Test App", metadata: { logo_uri: "https://logo.example/x.png" } },
    };
}

function buildNep413Bytes(overrides = {}) {
    const bytes = serialize(SCHEMA.SignMessagePayload, {
        tag: 0x8000019d,
        message: "Sign in to Example",
        nonce: new Array(32).fill(7),
        recipient: "example.near",
        callbackUrl: null,
        ...overrides,
    });
    return Array.from(bytes);
}

const KINDS = [
    { key: "transaction", formSecret: "TRANSACTION_FORM", modalId: "modal_tx", bytes: () => Array.from(buildTransaction().bytes) },
    {
        key: "delegateAction",
        formSecret: "DELEGATE_ACTION_FORM",
        modalId: "modal_delegate",
        bytes: () => Array.from(buildDelegateAction().bytes),
    },
    { key: "nep413", formSecret: "NEP413_FORM", modalId: "modal_nep413", bytes: buildNep413Bytes },
];
const kind = (key) => KINDS.find((k) => k.key === key);

describe("onExecutePostLogin — audience gating", () => {
    test("denies a signing-audience request that carries no payload", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(makeEvent({ query: {} }), api);
        expect(calls.deny).toEqual(["Signing audience requested without signing payload"]);
        expect(calls.render).toBeNull();
    });

    test.each(KINDS)("denies a $key sent to a non-signing audience", async ({ key, bytes }) => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(makeEvent({ query: { [key]: bytes().join(",") }, audience: "https://other.example" }), api);
        expect(calls.deny).toEqual(["Signing payload only allowed with signing audience"]);
        expect(calls.render).toBeNull();
    });

    test("no-ops (no deny, no render) for a non-signing audience without payload", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(makeEvent({ query: {}, audience: "https://other.example" }), api);
        expect(calls.deny).toEqual([]);
        expect(calls.render).toBeNull();
        expect(calls.removedScopes).toEqual([]);
    });
});

describe("onExecutePostLogin — rendering", () => {
    test("strips OIDC scopes, renders the tx modal with decoded fields, and sets the fatxn claim", async () => {
        const { api, calls } = makeApi();
        const { csv, bytes } = buildTransaction({
            signerId: "alice.near",
            receiverId: "bob.near",
            actions: [buildAction.transfer({ deposit: "1500000000000000000000000" })],
        });
        await onExecutePostLogin(makeEvent({ query: { transaction: csv } }), api);

        expect(calls.deny).toEqual([]);
        expect(calls.removedScopes.sort()).toEqual(["email", "offline_access", "profile"]);
        expect(calls.render.modalId).toBe("modal_tx");
        const { fields } = calls.render.opts;
        expect(fields.signerId).toBe("alice.near");
        expect(fields.receiverId).toBe("bob.near");
        expect(fields.name).toBe("Test App");
        expect(fields.imageUrl).toBe("https://logo.example/x.png");
        expect(JSON.parse(fields.actions)[0].transfer.deposit).toBe("1500000000000000000000000");
        expect(calls.customClaims.fatxn).toEqual(Array.from(bytes));
    });

    test("renders the delegate modal with senderId/maxBlockHeight and sets the fatxn claim", async () => {
        const { api, calls } = makeApi();
        const { csv, bytes } = buildDelegateAction({
            senderId: "alice.near",
            receiverId: "bob.near",
            maxBlockHeight: BigInt(1000),
            actions: [buildAction.transfer({ deposit: "1500000000000000000000000" })],
        });
        await onExecutePostLogin(makeEvent({ query: { delegateAction: csv } }), api);

        expect(calls.deny).toEqual([]);
        expect(calls.render.modalId).toBe("modal_delegate");
        const { fields } = calls.render.opts;
        expect(fields.senderId).toBe("alice.near");
        expect(fields.receiverId).toBe("bob.near");
        expect(fields.maxBlockHeight).toBe("1000");
        expect(JSON.parse(fields.actions)[0].transfer.deposit).toBe("1500000000000000000000000");
        expect(calls.customClaims.fatxn).toEqual(Array.from(bytes));
    });

    test("renders the NEP-413 modal with decoded fields and sets the fatxn claim", async () => {
        const { api, calls } = makeApi();
        const bytes = buildNep413Bytes({ message: "héllo 👋\nworld", callbackUrl: "https://example.com/cb" });
        await onExecutePostLogin(makeEvent({ query: { nep413: bytes.join(",") } }), api);

        expect(calls.deny).toEqual([]);
        expect(calls.render.modalId).toBe("modal_nep413");
        expect(calls.render.opts.fields).toEqual({
            name: "Test App",
            imageUrl: "https://logo.example/x.png",
            message: "héllo 👋\nworld",
            recipient: "example.near",
            callbackUrl: "https://example.com/cb",
        });
        expect(calls.customClaims.fatxn).toEqual(bytes);
    });

    test("decodes a NEP-413 payload laid out byte-for-byte as the spec describes", async () => {
        const tag = [0x9d, 0x01, 0x00, 0x80];
        const message = [3, 0, 0, 0, 0x68, 0xc3, 0xa9];
        const nonce = Array.from({ length: 32 }, (_, i) => i);
        const recipient = [1, 0, 0, 0, 0x61];
        const someCallbackUrl = [1, 1, 0, 0, 0, 0x63];
        const bytes = [...tag, ...message, ...nonce, ...recipient, ...someCallbackUrl];
        const { api, calls } = makeApi();
        await onExecutePostLogin(makeEvent({ query: { nep413: bytes.join(",") } }), api);

        expect(calls.deny).toEqual([]);
        expect(calls.render.opts.fields).toEqual(expect.objectContaining({ message: "hé", recipient: "a", callbackUrl: "c" }));
        expect(calls.customClaims.fatxn).toEqual(bytes);
    });

    test("renders an empty callback url when the NEP-413 payload has none", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(makeEvent({ query: { nep413: buildNep413Bytes().join(",") } }), api);

        expect(calls.render.opts.fields.callbackUrl).toBe("");
    });

    test.each([
        ...ALL_ACTION_TYPES.map((a) => ["transaction", a.name, () => buildTransaction({ actions: [a.build()] }).bytes]),
        ...DELEGATE_ACTION_TYPES.map((a) => ["delegateAction", a.name, () => buildDelegateAction({ actions: [a.build()] }).bytes]),
    ])("renders a %s with a %s action", async (key, _, build) => {
        const bytes = Array.from(build());
        const { api, calls } = makeApi();
        await onExecutePostLogin(makeEvent({ query: { [key]: bytes.join(",") } }), api);

        expect(calls.deny).toEqual([]);
        expect(calls.render.modalId).toBe(kind(key).modalId);
        expect(calls.customClaims.fatxn).toEqual(bytes);
    });

    test.each([
        [["transaction", "delegateAction"], "transaction"],
        [["nep413", "transaction"], "nep413"],
        [["nep413", "delegateAction"], "nep413"],
        [["nep413", "transaction", "delegateAction"], "nep413"],
    ])("with %j sent, renders and signs only the %s", async (keys, winner) => {
        const payloads = Object.fromEntries(keys.map((key) => [key, kind(key).bytes()]));
        const { api, calls } = makeApi();
        await onExecutePostLogin(makeEvent({ query: Object.fromEntries(keys.map((key) => [key, payloads[key].join(",")])) }), api);

        expect(calls.deny).toEqual([]);
        expect(calls.render.modalId).toBe(kind(winner).modalId);
        expect(calls.customClaims.fatxn).toEqual(payloads[winner]);
    });
});

describe("onExecutePostLogin — open client", () => {
    const DAPP = "https://dapp.example";
    const encodeState = (o, s = "wallet-state") => Buffer.from(JSON.stringify({ o, s })).toString("base64url");
    const SIGNING_SCOPE = "openid transaction:sign";
    const PKCE = { code_challenge: "lIXS0dr6H59gOSZmM7iyfEc0HzFJgI-BE4ctfEcyHKU", code_challenge_method: "S256" };

    function openClientEvent(query, { openLogin = "true", audience = ONCHAIN_AUDIENCE } = {}) {
        const event = makeEvent({ query, audience });
        event.client = { ...event.client, metadata: { ...event.client.metadata, open_login: openLogin } };
        return event;
    }

    function signInQuery(overrides = {}) {
        return { state: encodeState(DAPP), scope: "openid", prompt: "login", response_type: "code", ...PKCE, ...overrides };
    }

    function signingQuery(overrides = {}) {
        const { csv } = buildTransaction({ actions: [buildAction.transfer({ deposit: "1" })] });
        return {
            state: encodeState(DAPP),
            scope: SIGNING_SCOPE,
            audience: ONCHAIN_AUDIENCE,
            response_type: "code",
            transaction: csv,
            ...PKCE,
            ...overrides,
        };
    }

    test("names the origin from state on the consent screen", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(openClientEvent(signingQuery()), api);

        expect(calls.deny).toEqual([]);
        expect(calls.render.opts.fields.name).toBe("https://dapp.example");
        expect(calls.render.opts.fields.imageUrl).toBe("");
    });

    test("keeps the client branding for a client without open_login set to the string true", async () => {
        for (const openLogin of ["false", "TRUE", true]) {
            const { api, calls } = makeApi();
            await onExecutePostLogin(openClientEvent(signingQuery({ state: undefined }), { openLogin }), api);
            expect(calls.deny).toEqual([]);
            expect(calls.render.opts.fields.name).toBe("Test App");
        }
    });

    test("denies a state that does not carry an exact https or local origin", async () => {
        const states = [
            undefined,
            "not-base64-json",
            encodeState("https://dapp.example/path"),
            encodeState("javascript:alert(1)"),
            encodeState("<b>dapp</b>"),
            encodeState("ftp://dapp.example"),
            Buffer.from(JSON.stringify({ s: "x" })).toString("base64url"),
            Buffer.from(JSON.stringify({ o: DAPP })).toString("base64url"),
            Buffer.from(JSON.stringify({ o: DAPP, s: { nested: true } })).toString("base64url"),
            encodeState("https://dapp.example/"),
            encodeState("https://DAPP.example"),
            encodeState("https://good.example@evil.example"),
            encodeState("https://trusted.com&sol;&quest;.evil.io"),
            encodeState("https://trusted.com&#47;.evil.io"),
            encodeState("https://dapp_example.com"),
            [encodeState(DAPP), encodeState(DAPP)],
            [...Buffer.from(JSON.stringify({ o: DAPP, s: "x" }))],
            encodeState("http://dapp.example"),
            encodeState("http://localhost.evil.example"),
            encodeState("http://127.0.0.2"),
        ];
        for (const state of states) {
            const { api, calls } = makeApi();
            await onExecutePostLogin(openClientEvent(signingQuery({ state })), api);
            expect(calls.deny).toEqual(["Invalid login state"]);
            expect(calls.render).toBeNull();
        }
    });

    test("accepts plain http on a local host only", async () => {
        for (const origin of ["http://localhost:3000", "http://localhost", "http://127.0.0.1:5173"]) {
            const { api, calls } = makeApi();
            await onExecutePostLogin(openClientEvent(signingQuery({ state: encodeState(origin) })), api);
            expect(calls.deny).toEqual([]);
            expect(calls.render.opts.fields.name).toBe(origin);
        }
    });

    test("denies a missing or repeated scope", async () => {
        for (const scope of [undefined, ["openid", "openid"]]) {
            const { api, calls } = makeApi();
            await onExecutePostLogin(openClientEvent(signInQuery({ scope }), { audience: null }), api);
            expect(calls.deny).toEqual(["Scope not allowed"]);
        }
    });

    test("denies a request without S256 PKCE", async () => {
        for (const pkce of [
            { code_challenge: undefined },
            { code_challenge: "" },
            { code_challenge: "a".repeat(42) },
            { code_challenge: "a".repeat(129) },
            { code_challenge: `${"a".repeat(42)}+` },
            { code_challenge: [PKCE.code_challenge, PKCE.code_challenge] },
            { code_challenge_method: "plain" },
            { code_challenge_method: undefined },
        ]) {
            const { api, calls } = makeApi();
            await onExecutePostLogin(openClientEvent(signInQuery(pkce), { audience: null }), api);
            expect(calls.deny).toEqual(["PKCE required"]);
        }
    });

    test("accepts a 128 character code challenge", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(openClientEvent(signInQuery({ code_challenge: "A-_z".repeat(32) }), { audience: null }), api);
        expect(calls.deny).toEqual([]);
    });

    test("denies a response type other than code", async () => {
        for (const response_type of [undefined, "token", "id_token", "code id_token", ["code", "code"]]) {
            const { api, calls } = makeApi();
            await onExecutePostLogin(openClientEvent(signInQuery({ response_type }), { audience: null }), api);
            expect(calls.deny).toEqual(["Response type not allowed"]);
        }
    });

    test("denies a response mode other than query", async () => {
        for (const response_mode of ["web_message", "form_post", "fragment", ["query", "query"]]) {
            const { api, calls } = makeApi();
            await onExecutePostLogin(openClientEvent(signInQuery({ response_mode }), { audience: null }), api);
            expect(calls.deny).toEqual(["Response mode not allowed"]);
        }
    });

    test("allows the query response mode", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(openClientEvent(signInQuery({ response_mode: "query" }), { audience: null }), api);
        expect(calls.deny).toEqual([]);
    });

    test("denies a repeated prompt", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(openClientEvent(signInQuery({ prompt: ["login", "login"] }), { audience: null }), api);
        expect(calls.deny).toEqual(["Interactive login required"]);
    });

    test("allows a sign-in when the tenant applies another default audience", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(openClientEvent(signInQuery(), { audience: "https://default.api" }), api);
        expect(calls.deny).toEqual([]);
    });

    test("allows a sign-in that forces a fresh login with only openid", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(openClientEvent(signInQuery(), { audience: null }), api);
        expect(calls.deny).toEqual([]);
    });

    test("denies a sign-in that does not force a fresh login", async () => {
        for (const prompt of [undefined, "none", "consent"]) {
            const { api, calls } = makeApi();
            await onExecutePostLogin(openClientEvent(signInQuery({ prompt }), { audience: null }), api);
            expect(calls.deny).toEqual(["Interactive login required"]);
        }
    });

    test("denies a signing param that skips the login screen without reaching the consent form", async () => {
        const { csv } = buildTransaction({ actions: [buildAction.transfer({ deposit: "1" })] });
        for (const param of [{ transaction: csv }, { nep413: "" }, { delegateAction: "1" }]) {
            const { api, calls } = makeApi();
            await onExecutePostLogin(openClientEvent(signInQuery({ prompt: undefined, ...param }), { audience: null }), api);
            expect(calls.deny).toEqual(["Interactive login required"]);
            expect(calls.render).toBeNull();
        }
    });

    test("lets a signing request reach the consent form without prompt=login", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(openClientEvent(signingQuery()), api);
        expect(calls.deny).toEqual([]);
        expect(calls.render).not.toBeNull();
    });

    test("denies a silent signing request", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(openClientEvent(signingQuery({ prompt: "none" })), api);
        expect(calls.deny).toEqual(["Interactive login required"]);
        expect(calls.render).toBeNull();
    });

    test("denies profile scopes so no site collects email or name", async () => {
        for (const scope of ["openid profile", "openid email", "openid offline_access"]) {
            const { api, calls } = makeApi();
            await onExecutePostLogin(openClientEvent(signInQuery({ scope }), { audience: null }), api);
            expect(calls.deny).toEqual(["Scope not allowed"]);
        }
    });

    test("denies an audience other than the signing one", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(openClientEvent(signInQuery({ audience: "https://other.api" }), { audience: "https://other.api" }), api);
        expect(calls.deny).toEqual(["Audience not allowed"]);
    });
});

describe("onExecutePostLogin — refusals", () => {
    const encodings = [
        ["a truncated payload", (bytes) => bytes.slice(0, 10).join(",")],
        ["trailing bytes after the payload", (bytes) => [...bytes, 0].join(",")],
        ["a value above 255", (bytes) => bytes.with(-1, bytes.at(-1) + 256).join(",")],
        ["a fractional value", (bytes) => bytes.with(-1, bytes.at(-1) + 0.5).join(",")],
        ["a repeated query parameter", (bytes) => [bytes.join(","), bytes.join(",")]],
    ];

    test.each([
        ...KINDS.flatMap(({ key, bytes }) => encodings.map(([label, encode]) => [`a ${key} with ${label}`, { [key]: encode(bytes()) }])),
        ["a nep413 without the NEP-413 tag", { nep413: buildNep413Bytes({ tag: 1 }).join(",") }],
        ["a nep413 with an invalid option byte", { nep413: buildNep413Bytes().with(-1, 2).join(",") }],
        ["a nep413 whose message is malformed UTF-8", { nep413: buildNep413Bytes().with(8, 0x80).join(",") }],
        ["a delegateAction whose sender id is malformed UTF-8", { delegateAction: kind("delegateAction").bytes().with(8, 0x80).join(",") }],
        ["NEP-413 bytes sent as a delegateAction", { delegateAction: buildNep413Bytes().join(",") }],
    ])("denies %s without rendering or minting a claim", async (_, query) => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(makeEvent({ query }), api);

        expect(calls.deny).toEqual(["Invalid signing payload"]);
        expect(calls.render).toBeNull();
        expect(calls.customClaims.fatxn).toBeUndefined();
    });

    test.each(KINDS)(
        "refuses a $key without rendering or minting a claim when $formSecret is not set",
        async ({ key, formSecret, bytes }) => {
            const { api, calls } = makeApi();
            const event = makeEvent({ query: { [key]: bytes().join(",") } });
            event.secrets[formSecret] = undefined;
            await onExecutePostLogin(event, api);

            expect(calls.deny).toEqual(["Consent form is not configured"]);
            expect(calls.render).toBeNull();
            expect(calls.customClaims.fatxn).toBeUndefined();
        },
    );
});

describe("onContinuePostLogin — decision gating", () => {
    test.each([
        ["the user rejected the request", { prompt: { fields: { decision: "denied" } } }, ["User rejected the signing request"]],
        ["the user approved", { prompt: { fields: { decision: "approved" } } }, []],
        ["no decision was recorded", {}, ["Signing request was not approved"]],
        [
            "the decision is anything other than approved",
            { prompt: { fields: { decision: "Approved" } } },
            ["Signing request was not approved"],
        ],
    ])("when %s, denies with %j", async (_, event, expectedDenies) => {
        const { api, calls } = makeApi();
        await onContinuePostLogin(event, api);

        expect(calls.deny).toEqual(expectedDenies);
    });
});
