// The 2^31 offset keeps a signed message from ever decoding as a valid transaction.
const NEP413_TAG = 2 ** 31 + 413;

const NEP413_NONCE_LENGTH = 32;

/**
 * NEP-413 message parameters, as defined in https://github.com/near/NEPs/blob/master/neps/nep-0413.md
 */
export type SignMessageParams = {
    /**
     * The message the user is asked to sign
     */
    message: string;

    /**
     * The recipient the message is addressed to (e.g. "alice.near" or "myapp.com")
     */
    recipient: string;

    /**
     * A 32-byte nonce chosen by the app, used to prevent replays
     */
    nonce: Uint8Array;

    /**
     * Optional callback URL from NEP-413. It is only signed data: FastAuth never calls it
     */
    callbackUrl?: string;
};

/**
 * Encode a NEP-413 message as the borsh bytes whose sha256 the user signs.
 *
 * Layout: `borsh(u32 tag) || borsh({ message, nonce, recipient, callbackUrl })`.
 * @param params The NEP-413 message parameters.
 * @returns The encoded message as a number array.
 */
export function encodeSignMessage(params: SignMessageParams): number[] {
    const { message, recipient, nonce, callbackUrl } = params;
    if (nonce.length !== NEP413_NONCE_LENGTH) {
        throw new Error(`NEP-413 nonce must be ${NEP413_NONCE_LENGTH} bytes, got ${nonce.length}`);
    }

    const out: number[] = [];
    const writeU32 = (value: number) => {
        out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
    };
    const writeBytes = (bytes: ArrayLike<number>) => {
        // Pushed one by one: spreading a long message into push() can exceed the call stack limit.
        for (let i = 0; i < bytes.length; i++) out.push(bytes[i]);
    };
    const writeString = (value: string) => {
        const bytes = new TextEncoder().encode(value);
        writeU32(bytes.length);
        writeBytes(bytes);
    };

    writeU32(NEP413_TAG);
    writeString(message);
    writeBytes(nonce);
    writeString(recipient);
    if (callbackUrl == null) {
        out.push(0);
    } else {
        out.push(1);
        writeString(callbackUrl);
    }
    return out;
}
