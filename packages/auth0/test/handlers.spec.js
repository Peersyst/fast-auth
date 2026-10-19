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
