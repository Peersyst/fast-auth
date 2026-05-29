/**
 * @jest-environment node
 *
 * Tests for the Auth0 PostLogin handler (`onExecutePostLogin`) — the security-relevant
 * branching that the decoding specs don't touch: audience gating, OIDC scope stripping,
 * tx-vs-delegate dispatch, the `fields` shape handed to `api.prompt.render`, and the
 * `fatxn` custom claim. The `event`/`api` objects are mocked to the minimal surface the
 * handler reads.
 */
const { onExecutePostLogin } = require("../src/actions/authorize-app.action.js");
const { buildTransaction, buildDelegateAction, buildAction } = require("./fixtures/builders.js");

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
        },
        request: { query },
        resource_server: audience == null ? undefined : { identifier: audience },
        client: { name: "Test App", metadata: { logo_uri: "https://logo.example/x.png" } },
    };
}

describe("onExecutePostLogin — audience gating", () => {
    test("denies a signing-audience request that carries no payload", async () => {
        const { api, calls } = makeApi();
        await onExecutePostLogin(makeEvent({ query: {} }), api);
        expect(calls.deny).toEqual(["Signing audience requested without transaction payload"]);
        expect(calls.render).toBeNull();
    });

    test("denies a payload sent to a non-signing audience", async () => {
        const { api, calls } = makeApi();
        const { csv } = buildTransaction();
        await onExecutePostLogin(makeEvent({ query: { transaction: csv }, audience: "https://other.example" }), api);
        expect(calls.deny).toEqual(["Transaction payload only allowed with signing audience"]);
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

describe("onExecutePostLogin — transaction payload", () => {
    test("strips OIDC scopes, renders the tx modal with decoded fields, and sets the fatxn claim", async () => {
        const { api, calls } = makeApi();
        const { csv } = buildTransaction({
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
        // actions is a JSON string with the decoded action shape.
        const actions = JSON.parse(fields.actions);
        expect(actions[0].transfer.deposit).toBe("1500000000000000000000000");

        // fatxn is the raw numeric byte array of the payload.
        expect(calls.customClaims.fatxn).toEqual(csv.split(",").map(Number));
    });
});

describe("onExecutePostLogin — delegate-action payload", () => {
    test("renders the delegate modal with senderId/maxBlockHeight and sets the fatxn claim", async () => {
        const { api, calls } = makeApi();
        const { csv } = buildDelegateAction({
            senderId: "alice.near",
            receiverId: "bob.near",
            maxBlockHeight: BigInt(1000),
            actions: [buildAction.transfer()],
        });
        await onExecutePostLogin(makeEvent({ query: { delegateAction: csv } }), api);

        expect(calls.deny).toEqual([]);
        expect(calls.render.modalId).toBe("modal_delegate");
        const { fields } = calls.render.opts;
        expect(fields.senderId).toBe("alice.near");
        expect(fields.receiverId).toBe("bob.near");
        expect(fields.maxBlockHeight).toBe("1000");
        expect(calls.customClaims.fatxn).toEqual(csv.split(",").map(Number));
    });
});
