/**
 * @jest-environment node
 *
 * Tests for `decodeNep413Payload` — the validation gate for NEP-413 payloads.
 *
 * The guard contract never inspects the bytes it signs; it only checks that they equal the
 * `fatxn` claim. So every guarantee about *what* the user approved is established here.
 *
 * Two checks are load-bearing, and only two:
 *
 *   - the domain tag, without which the bytes could double as a NEAR transaction;
 *   - a non-empty message, without which the approval screen has nothing to show.
 *
 * The recipient is deliberately *not* restricted. Under NEP-413 it names the application a
 * message is addressed to, and the protection is that the user sees it on the approval screen —
 * the same way NEAR wallets behave. Restricting it here would also be the wrong granularity: a
 * recipient belongs to an application, not to a tenant that hosts many of them.
 */
const { decodeNep413Payload, extractIntents, stringifyIntents, NEP413_PREFIX_TAG } = require("../src/actions/authorize-app.action.js");
const { buildNep413Payload, buildIntentMessage, buildTransaction, toCsv, INTENTS_RECIPIENT } = require("./fixtures/builders.js");

describe("decodeNep413Payload — any valid message", () => {
    test("decodes a plain-text sign-in challenge", () => {
        const { csv } = buildNep413Payload({ rawMessage: "Sign in to example.com", recipient: "example.com" });
        const { payload, message } = decodeNep413Payload(csv);

        expect(payload.tag).toBe(NEP413_PREFIX_TAG);
        expect(payload.message).toBe("Sign in to example.com");
        expect(payload.recipient).toBe("example.com");
        // Not JSON, so there is no structured message — and that is fine.
        expect(message).toBeNull();
    });

    test("decodes a NEAR Intents message and exposes its body", () => {
        const { csv, message: original } = buildNep413Payload();
        const { payload, message } = decodeNep413Payload(csv);

        expect(payload.recipient).toBe(INTENTS_RECIPIENT);
        expect(message).toEqual(original);
        expect(extractIntents(message)).toHaveLength(1);
    });

    test("accepts any recipient", () => {
        for (const recipient of ["intents.near", "app.example.com", "alice.near", "some-dapp"]) {
            const { csv } = buildNep413Payload({ rawMessage: "hello", recipient });
            expect(decodeNep413Payload(csv).payload.recipient).toBe(recipient);
        }
    });

    test("accepts JSON that is not an intents body", () => {
        const { csv } = buildNep413Payload({ rawMessage: JSON.stringify({ purpose: "login", session: "abc" }) });
        const { message } = decodeNep413Payload(csv);

        expect(message).toEqual({ purpose: "login", session: "abc" });
        expect(extractIntents(message)).toBeNull();
    });

    test("carries the callback url through when present", () => {
        const { csv } = buildNep413Payload({ rawMessage: "hello", callbackUrl: "https://example.com/cb" });
        expect(decodeNep413Payload(csv).payload.callbackUrl).toBe("https://example.com/cb");
    });

    test("round-trips the exact byte string it was given", () => {
        const { csv, bytes } = buildNep413Payload();
        // The action puts the query value straight into `fatxn`, so what gets approved must be
        // byte-identical to what was decoded for display.
        expect(csv.split(",").map(Number)).toEqual(Array.from(bytes));
    });

    test("accepts multiple intents in a single message", () => {
        const message = buildIntentMessage({
            intents: [
                { intent: "transfer", receiver_id: "a.near", tokens: { "nep141:usdc.near": "1" } },
                { intent: "transfer", receiver_id: "b.near", tokens: { "nep141:usdt.near": "2" } },
            ],
        });
        const { csv } = buildNep413Payload({ message });
        expect(extractIntents(decodeNep413Payload(csv).message)).toHaveLength(2);
    });
});

describe("decodeNep413Payload — domain separation", () => {
    test("rejects a payload whose tag is not the NEP-413 prefix", () => {
        const { csv } = buildNep413Payload({ tag: 1 });
        expect(() => decodeNep413Payload(csv)).toThrow(/missing the NEP-413 domain tag/);
    });

    test("rejects the delegate-action prefix reused as a tag", () => {
        const { csv } = buildNep413Payload({ tag: Math.pow(2, 30) + 366 });
        expect(() => decodeNep413Payload(csv)).toThrow(/missing the NEP-413 domain tag/);
    });

    test("rejects transaction bytes submitted as a message", () => {
        // A real NEAR transaction must never decode into an approvable message, whether it
        // fails at borsh or at the tag check.
        const { csv } = buildTransaction();
        expect(() => decodeNep413Payload(csv)).toThrow();
    });
});

describe("decodeNep413Payload — message must be showable", () => {
    test("rejects an empty message", () => {
        const { csv } = buildNep413Payload({ rawMessage: "" });
        expect(() => decodeNep413Payload(csv)).toThrow(/message is empty/);
    });

    test("accepts a message with no intents array", () => {
        // Previously rejected. A message need not be a NEAR Intents body to be worth signing.
        const { csv } = buildNep413Payload({ rawMessage: JSON.stringify({ signer_id: "trader.near" }) });
        expect(() => decodeNep413Payload(csv)).not.toThrow();
    });

    test("accepts a message whose intents array is empty", () => {
        const { csv } = buildNep413Payload({ message: buildIntentMessage({ intents: [] }) });
        const { message } = decodeNep413Payload(csv);
        expect(extractIntents(message)).toBeNull();
    });
});

describe("decodeNep413Payload — malformed input", () => {
    test("rejects bytes that are not a NEP-413 payload", () => {
        expect(() => decodeNep413Payload(toCsv(Uint8Array.from([1, 2, 3, 4])))).toThrow(/not a valid NEP-413 message/);
    });

    test("rejects an empty payload", () => {
        expect(() => decodeNep413Payload("")).toThrow(/not a valid NEP-413 message/);
    });

    test("rejects a truncated payload", () => {
        const { bytes } = buildNep413Payload();
        expect(() => decodeNep413Payload(toCsv(bytes.slice(0, Math.floor(bytes.length / 2))))).toThrow(
            /not a valid NEP-413 message/,
        );
    });
});

describe("extractIntents", () => {
    test("returns the intents array of a NEAR Intents body", () => {
        const message = buildIntentMessage();
        expect(extractIntents(message)).toEqual(message.intents);
    });

    test("returns null for anything that is not one", () => {
        for (const value of [null, {}, { intents: [] }, { intents: "transfer" }, { intents: {} }]) {
            expect(extractIntents(value)).toBeNull();
        }
    });
});

describe("stringifyIntents", () => {
    test("pretty-prints the intents for the approval screen", () => {
        const serialized = stringifyIntents(buildIntentMessage().intents);
        expect(JSON.parse(serialized)).toEqual(buildIntentMessage().intents);
        expect(serialized).toContain("\n");
    });

    test("renders bigint amounts instead of throwing on them", () => {
        // JSON.stringify throws on BigInt by default, and token amounts are a plausible place
        // for one to arrive.
        const serialized = stringifyIntents([{ intent: "transfer", tokens: { "nep141:usdc.near": BigInt("1000000") } }]);
        expect(JSON.parse(serialized).tokens ?? JSON.parse(serialized)[0].tokens).toEqual({ "nep141:usdc.near": "1000000" });
    });
});
