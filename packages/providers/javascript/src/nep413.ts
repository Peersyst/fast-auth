import { serialize } from "borsh";
import type { Schema } from "borsh";

/**
 * Domain-separation tag mandated by NEP-413 (2^31 + 413). Prepending it guarantees the signed
 * bytes can never be reinterpreted as a NEAR transaction, whose borsh encoding begins with the
 * signerId length — a small u32.
 *
 * https://github.com/near/NEPs/blob/master/neps/nep-0413.md#how-to-ensure-the-message-is-not-a-transaction
 */
export const NEP413_PREFIX_TAG = 2147484061;

/** NEP-413 fixes the nonce at 32 bytes. */
export const NEP413_NONCE_LENGTH = 32;

/**
 * Borsh schema of the NEP-413 payload. Field order is normative — it must match the schema the
 * Auth0 action decodes with, or the bytes committed to `fatxn` will not match what was signed.
 *
 * https://github.com/near/NEPs/blob/master/neps/nep-0413.md#input-interface
 */
export const NEP413_PAYLOAD_SCHEMA: Schema = {
    struct: {
        tag: "u32",
        message: "string",
        nonce: { array: { type: "u8", len: NEP413_NONCE_LENGTH } },
        recipient: "string",
        callbackUrl: { option: "string" },
    },
};

export type NEP413Payload = {
    /**
     * The message to sign. For NEAR Intents this is the JSON-encoded intent body
     * (`signer_id`, `deadline`, `intents`).
     */
    message: string;
    /**
     * 32-byte nonce. Generated when omitted.
     */
    nonce?: Uint8Array;
    /**
     * Account the message is addressed to — the intents verifier, e.g. `intents.near`.
     */
    recipient: string;
    callbackUrl?: string;
};

/**
 * Generate a random 32-byte NEP-413 nonce.
 * @returns The nonce.
 */
export function generateNep413Nonce(): Uint8Array {
    return globalThis.crypto.getRandomValues(new Uint8Array(NEP413_NONCE_LENGTH));
}

/**
 * Borsh-serialize a NEP-413 payload into the exact bytes that get signed and committed to the fatxn claim.
 * @param payload The payload to encode.
 * @returns The serialized payload.
 */
export function serializeNep413Payload(payload: NEP413Payload): Uint8Array {
    const nonce = payload.nonce ?? generateNep413Nonce();
    if (nonce.length !== NEP413_NONCE_LENGTH) {
        throw new Error(`NEP-413 nonce must be ${NEP413_NONCE_LENGTH} bytes, got ${nonce.length}`);
    }

    return serialize(NEP413_PAYLOAD_SCHEMA, {
        tag: NEP413_PREFIX_TAG,
        message: payload.message,
        nonce,
        recipient: payload.recipient,
        callbackUrl: payload.callbackUrl ?? null,
    });
}

/**
 * Encode a NEP-413 payload as the number array the Auth0 authorize query string carries.
 * @param payload The payload to encode.
 * @returns The encoded payload.
 */
export function encodeNep413Payload(payload: NEP413Payload): number[] {
    return Array.from(serializeNep413Payload(payload));
}
