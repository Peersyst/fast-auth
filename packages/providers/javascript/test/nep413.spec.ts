import { deserialize } from "borsh";
import {
    NEP413_NONCE_LENGTH,
    NEP413_PAYLOAD_SCHEMA,
    NEP413_PREFIX_TAG,
    encodeNep413Payload,
    generateNep413Nonce,
    serializeNep413Payload,
    buildNep413SignedMessage,
} from "../src/nep413";

const FIXED_NONCE = Uint8Array.from(Array.from({ length: NEP413_NONCE_LENGTH }, (_, i) => (i * 3) % 256));

const INTENT_MESSAGE = JSON.stringify({
    signer_id: "trader.near",
    deadline: "2026-01-01T00:00:00.000Z",
    intents: [{ intent: "transfer", receiver_id: "deposit.near", tokens: { "nep141:usdc.near": "1000000" } }],
});

describe("serializeNep413Payload", () => {
    it("round-trips every field through the NEP-413 schema", () => {
        const bytes = serializeNep413Payload({
            message: INTENT_MESSAGE,
            nonce: FIXED_NONCE,
            recipient: "intents.near",
        });

        const decoded = deserialize(NEP413_PAYLOAD_SCHEMA, bytes) as any;

        expect(decoded.tag).toBe(NEP413_PREFIX_TAG);
        expect(decoded.message).toBe(INTENT_MESSAGE);
        expect(Array.from(decoded.nonce)).toEqual(Array.from(FIXED_NONCE));
        expect(decoded.recipient).toBe("intents.near");
        expect(decoded.callbackUrl).toBeNull();
    });

    it("always stamps the NEP-413 domain tag", () => {
        // Domain separation is what keeps these bytes from being a valid NEAR transaction.
        // It is not caller-supplied precisely so it cannot be omitted.
        const bytes = serializeNep413Payload({ message: "{}", nonce: FIXED_NONCE, recipient: "intents.near" });
        const decoded = deserialize(NEP413_PAYLOAD_SCHEMA, bytes) as any;
        expect(decoded.tag).toBe(NEP413_PREFIX_TAG);
        expect(NEP413_PREFIX_TAG).toBe(Math.pow(2, 31) + 413);
    });

    it("includes the callback url when given", () => {
        const bytes = serializeNep413Payload({
            message: "{}",
            nonce: FIXED_NONCE,
            recipient: "intents.near",
            callbackUrl: "https://app.example/cb",
        });
        const decoded = deserialize(NEP413_PAYLOAD_SCHEMA, bytes) as any;
        expect(decoded.callbackUrl).toBe("https://app.example/cb");
    });

    it("generates a nonce when none is supplied", () => {
        const bytes = serializeNep413Payload({ message: "{}", recipient: "intents.near" });
        const decoded = deserialize(NEP413_PAYLOAD_SCHEMA, bytes) as any;
        expect(decoded.nonce).toHaveLength(NEP413_NONCE_LENGTH);
    });

    it("is deterministic for a fixed nonce", () => {
        const params = { message: INTENT_MESSAGE, nonce: FIXED_NONCE, recipient: "intents.near" };
        expect(Array.from(serializeNep413Payload(params))).toEqual(Array.from(serializeNep413Payload(params)));
    });

    it("produces different bytes for different recipients", () => {
        const a = serializeNep413Payload({ message: "{}", nonce: FIXED_NONCE, recipient: "intents.near" });
        const b = serializeNep413Payload({ message: "{}", nonce: FIXED_NONCE, recipient: "intents.testnet" });
        expect(Array.from(a)).not.toEqual(Array.from(b));
    });

    it("rejects a nonce of the wrong length", () => {
        expect(() => serializeNep413Payload({ message: "{}", nonce: new Uint8Array(16), recipient: "intents.near" })).toThrow(
            /must be 32 bytes/,
        );
    });
});

describe("generateNep413Nonce", () => {
    it("returns 32 bytes", () => {
        expect(generateNep413Nonce()).toHaveLength(NEP413_NONCE_LENGTH);
    });

    it("does not repeat across calls", () => {
        expect(Array.from(generateNep413Nonce())).not.toEqual(Array.from(generateNep413Nonce()));
    });
});

describe("encodeNep413Payload", () => {
    it("returns the serialized bytes as a plain number array", () => {
        const params = { message: INTENT_MESSAGE, nonce: FIXED_NONCE, recipient: "intents.near" };
        const encoded = encodeNep413Payload(params);

        expect(Array.isArray(encoded)).toBe(true);
        expect(encoded).toEqual(Array.from(serializeNep413Payload(params)));
        expect(encoded.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)).toBe(true);
    });

    it("encodes an arbitrary sign-in challenge, not just intents", () => {
        // NEP-413 messages are arbitrary strings; the serializer must not assume JSON.
        const encoded = encodeNep413Payload({
            message: "Sign in to example.com",
            nonce: FIXED_NONCE,
            recipient: "example.com",
        });
        expect(encoded.length).toBeGreaterThan(0);
    });
});

describe("buildNep413SignedMessage", () => {
    const SIGNATURE = Uint8Array.from(Array.from({ length: 64 }, (_, i) => i));

    it("returns the shape NEP-413 defines for a signed message", () => {
        const signed = buildNep413SignedMessage({
            accountId: "trader.near",
            publicKey: "ed25519:abc",
            signature: SIGNATURE,
        });

        expect(signed).toEqual({
            accountId: "trader.near",
            publicKey: "ed25519:abc",
            signature: expect.any(String),
        });
    });

    it("base64-encodes the signature", () => {
        const signed = buildNep413SignedMessage({ accountId: "a.near", publicKey: "ed25519:k", signature: SIGNATURE });
        // Round-trip through atob to prove the bytes survive intact.
        const decoded = Uint8Array.from(globalThis.atob(signed.signature), (c) => c.charCodeAt(0));
        expect(Array.from(decoded)).toEqual(Array.from(SIGNATURE));
    });

    it("accepts a plain number array as the signature", () => {
        const fromArray = buildNep413SignedMessage({ accountId: "a.near", publicKey: "ed25519:k", signature: Array.from(SIGNATURE) });
        const fromBytes = buildNep413SignedMessage({ accountId: "a.near", publicKey: "ed25519:k", signature: SIGNATURE });
        expect(fromArray.signature).toBe(fromBytes.signature);
    });

    it("echoes the state when one was supplied", () => {
        const signed = buildNep413SignedMessage({
            accountId: "a.near",
            publicKey: "ed25519:k",
            signature: SIGNATURE,
            state: "csrf-token",
        });
        expect(signed.state).toBe("csrf-token");
    });

    it("omits state entirely when none was supplied", () => {
        const signed = buildNep413SignedMessage({ accountId: "a.near", publicKey: "ed25519:k", signature: SIGNATURE });
        expect("state" in signed).toBe(false);
    });
});
