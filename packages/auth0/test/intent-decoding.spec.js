/**
 * @jest-environment node
 *
 * Tests for `decodeIntent` — the validation gate for NEP-413 payloads.
 *
 * The guard contract never inspects the bytes it signs; it only checks that they equal the
 * `fatxn` claim. So every guarantee about *what* the user approved is established here, and
 * each rejection below maps to a concrete way the consent guarantee could be bypassed:
 *
 *   - wrong/absent domain tag  → bytes that could double as a NEAR transaction
 *   - unexpected recipient     → an intent redirected to a different verifier
 *   - unparseable message      → a payload the approval screen cannot describe
 *   - empty intents            → an approval that shows the user nothing
 */
const { decodeIntent, NEP413_PREFIX_TAG, DEFAULT_INTENTS_RECIPIENT } = require("../src/actions/authorize-app.action.js");
const { buildIntentPayload, buildIntentMessage, buildTransaction, toCsv } = require("./fixtures/builders.js");

describe("decodeIntent — happy path", () => {
    test("decodes a well-formed transfer intent", () => {
        const { csv, message } = buildIntentPayload();
        const { payload, message: decoded } = decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT);

        expect(payload.tag).toBe(NEP413_PREFIX_TAG);
        expect(payload.recipient).toBe(DEFAULT_INTENTS_RECIPIENT);
        expect(decoded).toEqual(message);
        expect(decoded.intents).toHaveLength(1);
        expect(decoded.intents[0].intent).toBe("transfer");
    });

    test("round-trips the exact byte string it was given", () => {
        const { csv, bytes } = buildIntentPayload();
        // The action puts `query.intent` straight into `fatxn`, so the bytes the user approves
        // must be byte-identical to what was decoded for display.
        expect(csv.split(",").map(Number)).toEqual(Array.from(bytes));
        expect(() => decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT)).not.toThrow();
    });

    test("accepts multiple intents in a single payload", () => {
        const message = buildIntentMessage({
            intents: [
                { intent: "transfer", receiver_id: "a.near", tokens: { "nep141:usdc.near": "1" } },
                { intent: "transfer", receiver_id: "b.near", tokens: { "nep141:usdt.near": "2" } },
            ],
        });
        const { csv } = buildIntentPayload({ message });
        const { message: decoded } = decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT);
        expect(decoded.intents).toHaveLength(2);
    });

    test("accepts a custom verifier when that is what the caller expects", () => {
        const { csv } = buildIntentPayload({ recipient: "intents.testnet" });
        expect(() => decodeIntent(csv, "intents.testnet")).not.toThrow();
    });
});

describe("decodeIntent — domain separation", () => {
    test("rejects a payload whose tag is not the NEP-413 prefix", () => {
        const { csv } = buildIntentPayload({ tag: 1 });
        expect(() => decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT)).toThrow(/missing the NEP-413 domain tag/);
    });

    test("rejects the delegate-action prefix reused as a tag", () => {
        const { csv } = buildIntentPayload({ tag: Math.pow(2, 30) + 366 });
        expect(() => decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT)).toThrow(/missing the NEP-413 domain tag/);
    });

    test("rejects transaction bytes submitted as an intent", () => {
        // A real NEAR transaction must never decode into an approvable intent, whether it
        // fails at borsh or at the tag check.
        const { csv } = buildTransaction();
        expect(() => decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT)).toThrow();
    });
});

describe("decodeIntent — recipient anchoring", () => {
    test("rejects an intent aimed at a different verifier", () => {
        const { csv } = buildIntentPayload({ recipient: "evil.near" });
        expect(() => decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT)).toThrow(/unexpected recipient: evil\.near/);
    });

    test("rejects an empty recipient", () => {
        const { csv } = buildIntentPayload({ recipient: "" });
        expect(() => decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT)).toThrow(/unexpected recipient/);
    });
});

describe("decodeIntent — message validation", () => {
    test("rejects a message that is not JSON", () => {
        const { csv } = buildIntentPayload({ rawMessage: "not json at all" });
        expect(() => decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT)).toThrow(/not valid JSON/);
    });

    test("rejects a message with no intents array", () => {
        const { csv } = buildIntentPayload({ rawMessage: JSON.stringify({ signer_id: "trader.near" }) });
        expect(() => decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT)).toThrow(/no intents to approve/);
    });

    test("rejects an empty intents array", () => {
        const { csv } = buildIntentPayload({ message: buildIntentMessage({ intents: [] }) });
        expect(() => decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT)).toThrow(/no intents to approve/);
    });

    test("rejects intents that is a JSON value but not an array", () => {
        const { csv } = buildIntentPayload({ rawMessage: JSON.stringify({ intents: { intent: "transfer" } }) });
        expect(() => decodeIntent(csv, DEFAULT_INTENTS_RECIPIENT)).toThrow(/no intents to approve/);
    });
});

describe("decodeIntent — malformed input", () => {
    test("rejects bytes that are not a NEP-413 payload", () => {
        expect(() => decodeIntent(toCsv(Uint8Array.from([1, 2, 3, 4])), DEFAULT_INTENTS_RECIPIENT)).toThrow(
            /not a valid NEP-413 message/,
        );
    });

    test("rejects an empty payload", () => {
        expect(() => decodeIntent("", DEFAULT_INTENTS_RECIPIENT)).toThrow(/not a valid NEP-413 message/);
    });

    test("rejects a truncated payload", () => {
        const { bytes } = buildIntentPayload();
        const truncated = bytes.slice(0, Math.floor(bytes.length / 2));
        expect(() => decodeIntent(toCsv(truncated), DEFAULT_INTENTS_RECIPIENT)).toThrow(/not a valid NEP-413 message/);
    });
});
