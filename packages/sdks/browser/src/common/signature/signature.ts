import { ec as EC } from "elliptic";
import { MPCSignaturePayload } from "./types";

/**
 * A class that represents a signature from the FastAuth contract.
 */
export class FastAuthSignature {
    private readonly payload: MPCSignaturePayload;

    constructor(payload: MPCSignaturePayload) {
        this.payload = payload;
    }

    /**
     * Create a FastAuthSignature from a base64 payload.
     * @param base64Payload The base64 payload to create the signature from.
     * @returns A new FastAuthSignature instance.
     */
    static fromBase64(base64Payload: string): FastAuthSignature {
        const payload = JSON.parse(Buffer.from(base64Payload, "base64").toString());
        return new FastAuthSignature(payload);
    }

    /**
     * Recover the public key from the signature.
     * @returns The public key as a buffer.
     */
    recover(): Buffer {
        const secp256k1 = new EC("secp256k1");

        // Inputs from MPC signer
        const compressedR = this.payload.big_r.affine_point;
        const sHex = this.payload.s.scalar;
        const recoveryId = this.payload.recovery_id;

        // 1. Decompress big_r to get x (used as r scalar)
        const point = secp256k1.keyFromPublic(compressedR, "hex").getPublic();
        const r = point.getX().toArrayLike(Buffer, "be", 32);

        // 2. s is already the scalar
        const s = Buffer.from(sHex, "hex");

        // 3. Normalize recovery ID
        const v = recoveryId & 0x01; // should be 0 or 1

        return Buffer.concat([r, s, Buffer.from([v])]);
    }
}
