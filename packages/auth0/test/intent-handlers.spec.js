/**
 * @jest-environment node
 *
 * Tests for the intent branch of `onExecutePostLogin`: form dispatch, the `fields` shape the
 * approval screen receives, the `fatxn` claim, denial on an undecodable payload, and the
 * single-payload rule.
 */
const { onExecutePostLogin } = require("../src/actions/authorize-app.action.js");
const { buildIntentPayload, buildIntentMessage, buildTransaction, buildDelegateAction } = require("./fixtures/builders.js");

const ONCHAIN_AUDIENCE = "https://onchain.example";

function makeApi() {
    const calls = { deny: [], removedScopes: [], customClaims: {}, render: null };
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

function makeEvent({ query = {}, audience = ONCHAIN_AUDIENCE, intentsRecipient } = {}) {
    return {
        secrets: {
            ONCHAIN_AUDIENCE,
            TRANSACTION_FORM: "modal_tx",
            DELEGATE_ACTION_FORM: "modal_delegate",
            INTENT_FORM: "modal_intent",
            ...(intentsRecipient ? { INTENTS_RECIPIENT: intentsRecipient } : {}),
        },
        request: { query },
        resource_server: audience == null ? undefined : { identifier: audience },
        client: { name: "Test App", metadata: { logo_uri: "https://logo.example/x.png" } },
    };
}

describe("onExecutePostLogin — intent dispatch", () => {
    test("renders the intent form with signer, verifier and deadline", async () => {
        const { api, calls } = makeApi();
        const { csv, message } = buildIntentPayload();

        await onExecutePostLogin(makeEvent({ query: { intent: csv } }), api);

        expect(calls.deny).toEqual([]);
        expect(calls.render.modalId).toBe("modal_intent");
        expect(calls.render.opts.fields).toMatchObject({
            name: "Test App",
            imageUrl: "https://logo.example/x.png",
            signerId: message.signer_id,
            recipient: "intents.near",
            deadline: message.deadline,
        });
    });

    test("hands the intents to the form as a JSON string", async () => {
        const { api, calls } = makeApi();
        const { csv, message } = buildIntentPayload();

        await onExecutePostLogin(makeEvent({ query: { intent: csv } }), api);

        expect(JSON.parse(calls.render.opts.fields.intents)).toEqual(message.intents);
    });

    test("sets fatxn to the exact bytes received", async () => {
        const { api, calls } = makeApi();
        const { csv, bytes } = buildIntentPayload();

        await onExecutePostLogin(makeEvent({ query: { intent: csv } }), api);

        // The guard compares fatxn to sign_payload byte for byte; any transformation here
        // would make every signature fail on-chain.
        expect(calls.customClaims.fatxn).toEqual(Array.from(bytes));
    });

    test("strips the OIDC profile scopes like the other payload types", async () => {
        const { api, calls } = makeApi();
        const { csv } = buildIntentPayload();

        await onExecutePostLogin(makeEvent({ query: { intent: csv } }), api);

        expect(calls.removedScopes).toEqual(["profile", "email", "offline_access"]);
    });

    test("honours a tenant-configured verifier", async () => {
        const { api, calls } = makeApi();
        const { csv } = buildIntentPayload({ recipient: "intents.testnet" });

        await onExecutePostLogin(makeEvent({ query: { intent: csv }, intentsRecipient: "intents.testnet" }), api);

        expect(calls.deny).toEqual([]);
        expect(calls.render.opts.fields.recipient).toBe("intents.testnet");
    });
});

describe("onExecutePostLogin — intent rejection", () => {
    test("denies instead of rendering when the payload cannot be decoded", async () => {
        const { api, calls } = makeApi();
        const { csv } = buildIntentPayload({ tag: 7 });

        await onExecutePostLogin(makeEvent({ query: { intent: csv } }), api);

        expect(calls.deny).toEqual(["Intent payload is missing the NEP-413 domain tag"]);
        expect(calls.render).toBeNull();
        expect(calls.customClaims.fatxn).toBeUndefined();
    });

    test("denies an intent aimed at another verifier", async () => {
        const { api, calls } = makeApi();
        const { csv } = buildIntentPayload({ recipient: "evil.near" });

        await onExecutePostLogin(makeEvent({ query: { intent: csv } }), api);

        expect(calls.deny).toEqual(["Intent payload targets an unexpected recipient: evil.near"]);
        expect(calls.customClaims.fatxn).toBeUndefined();
    });

    test("denies an intent whose message shows the user nothing", async () => {
        const { api, calls } = makeApi();
        const { csv } = buildIntentPayload({ message: buildIntentMessage({ intents: [] }) });

        await onExecutePostLogin(makeEvent({ query: { intent: csv } }), api);

        expect(calls.deny).toEqual(["Intent message carries no intents to approve"]);
        expect(calls.customClaims.fatxn).toBeUndefined();
    });

    test("denies an intent sent to a non-signing audience", async () => {
        const { api, calls } = makeApi();
        const { csv } = buildIntentPayload();

        await onExecutePostLogin(makeEvent({ query: { intent: csv }, audience: "https://other.example" }), api);

        expect(calls.deny).toEqual(["Transaction payload only allowed with signing audience"]);
    });
});

describe("onExecutePostLogin — single payload rule", () => {
    test("denies when an intent arrives alongside a transaction", async () => {
        const { api, calls } = makeApi();
        const { csv: intentCsv } = buildIntentPayload();
        const { csv: txCsv } = buildTransaction();

        await onExecutePostLogin(makeEvent({ query: { intent: intentCsv, transaction: txCsv } }), api);

        // Otherwise the screen could show one payload while a different one lands in fatxn.
        expect(calls.deny).toEqual(["Only one signing payload may be requested at a time"]);
        expect(calls.render).toBeNull();
        expect(calls.customClaims.fatxn).toBeUndefined();
    });

    test("denies when a transaction arrives alongside a delegate action", async () => {
        const { api, calls } = makeApi();
        const { csv: txCsv } = buildTransaction();
        const { csv: delegateCsv } = buildDelegateAction();

        await onExecutePostLogin(makeEvent({ query: { transaction: txCsv, delegateAction: delegateCsv } }), api);

        expect(calls.deny).toEqual(["Only one signing payload may be requested at a time"]);
        expect(calls.render).toBeNull();
    });
});
