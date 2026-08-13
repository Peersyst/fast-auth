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
     * The message to sign. Any string: a human-readable challenge such as "Sign in to
     * example.com", or a structured body like the NEAR Intents JSON (`signer_id`, `deadline`,
     * `intents`), which the approval screen renders as individual intents.
     */
    message: string;
    /**
     * 32-byte nonce guarding against replay. Generated when omitted.
     */
    nonce?: Uint8Array;
    /**
     * Account the message is addressed to, e.g. `intents.near` or an app's own account. Under
     * NEP-413 this is what stops a message from being relayed to a third party, and it is shown
     * to the user on the approval screen.
     */
    recipient: string;
    /**
     * Optional URL the signing result is returned to. Part of the signed payload.
     */
    callbackUrl?: string;
};

/**
 * A NEP-413 signature result, in the shape the standard defines for `signMessage`.
 * https://github.com/near/NEPs/blob/master/neps/nep-0413.md#output-interface
 */
export type NEP413SignedMessage = {
    /** The signing account. */
    accountId: string;
    /** Public key as `<curve>:<base58>`. */
    publicKey: string;
    /** Base64-encoded signature over sha256 of the serialized payload. */
    signature: string;
    /**
     * Echo of the caller's CSRF state, when one was supplied.
     *
     * NEP-413's `state` never leaves the client: the standard defines it as a value the caller
     * generates, holds, and matches when the result comes back. It is deliberately absent from
     * the signed payload and from the authorization request — Auth0 mints its own `state` for
     * the OAuth exchange and overwrites anything passed alongside it, so routing NEP-413's state
     * through there would silently drop it. Hold it caller-side and attach it here.
     */
    state?: string;
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

/**
 * Assemble a NEP-413 SignedMessage from a signature produced through the FastAuth flow, so callers can hand verifiers the exact shape the standard defines.
 * @param params The signing account, its public key, the raw signature and an optional state.
 * @returns The signed message.
 */
export function buildNep413SignedMessage(params: {
    accountId: string;
    publicKey: string;
    signature: Uint8Array | number[];
    state?: string;
}): NEP413SignedMessage {
    const bytes = params.signature instanceof Uint8Array ? params.signature : Uint8Array.from(params.signature);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);

    return {
        accountId: params.accountId,
        publicKey: params.publicKey,
        signature: globalThis.btoa(binary),
        ...(params.state !== undefined ? { state: params.state } : {}),
    };
}
