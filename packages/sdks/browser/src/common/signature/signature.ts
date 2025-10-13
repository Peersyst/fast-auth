import { ec as EC } from "elliptic";
import { MPCSignaturePayload, Algorithm } from "./types";
import { FastAuthSignatureError } from "./signature.errors";
import { ED25519ErrorCodes, SECP256K1ErrorCodes, SignatureErrorCodes } from "./signature.error-codes";

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
     * Recover ed25519 signature from the payload.
     * @returns The ed25519 signature bytes.
     */
    private recoverEd25519(): Buffer {
        // MPC may return { signature: number[] } for ed25519
        const sigArr = (this.payload as any).signature as number[] | undefined;
        if (Array.isArray(sigArr)) {
            const sig = Buffer.from(sigArr);
            if (sig.length !== 64) {
                throw new FastAuthSignatureError(ED25519ErrorCodes.INVALID_ED25519_SIGNATURE_LENGTH);
            }
            return sig;
        }

        // Backward compatibility if ed25519 arrives in ECDSA-like shape
        const compressedR = (this.payload as any).big_r?.affine_point as string | undefined;
        const sHex = (this.payload as any).s?.scalar as string | undefined;
        if (!compressedR || !sHex) {
            throw new FastAuthSignatureError(ED25519ErrorCodes.INVALID_ED25519_PAYLOAD);
        }
        
        let R = Buffer.from(compressedR, "hex");
        let S = Buffer.from(sHex, "hex");
        
        // Normalize R and S to 32 bytes
        if (R.length === 33) R = R.subarray(1);
        if (R.length > 32) R = R.subarray(R.length - 32);
        if (R.length < 32) R = Buffer.concat([Buffer.alloc(32 - R.length, 0), R]);
        if (S.length > 32) S = S.subarray(S.length - 32);
        if (S.length < 32) S = Buffer.concat([Buffer.alloc(32 - S.length, 0), S]);
        
        return Buffer.concat([R, S]);
    }

    /**
     * Recover secp256k1 signature from the payload.
     * @returns The secp256k1 signature bytes (r||s||v format, 65 bytes).
     */
    private recoverSecp256k1(): Buffer {
        const compressedR = (this.payload as any).big_r?.affine_point as string | undefined;
        const sHex = (this.payload as any).s?.scalar as string | undefined;
        const recoveryId = (this.payload as any).recovery_id as number | undefined;
        
        if (!compressedR || !sHex || recoveryId === undefined) {
            throw new FastAuthSignatureError(SECP256K1ErrorCodes.INVALID_SECP256K1_PAYLOAD);
        }

        const secp256k1 = new EC("secp256k1");
        const point = secp256k1.keyFromPublic(compressedR, "hex").getPublic();
        const r = point.getX().toArrayLike(Buffer, "be", 32);
        const s = Buffer.from(sHex, "hex");
        const v = recoveryId & 0x01;
        
        return Buffer.concat([r, s, Buffer.from([v])]);
    }

    /**
     * Recover the signature bytes according to the algorithm.
     * @param algorithm The signature algorithm ("secp256k1" | "ed25519").
     * @returns The signature bytes.
     */
    recover(algorithm: Algorithm = "ed25519"): Buffer {
        switch (algorithm) {
            case "ed25519":
                return this.recoverEd25519();
            case "secp256k1":
                return this.recoverSecp256k1();
            default:
                throw new FastAuthSignatureError(SignatureErrorCodes.UNSUPPORTED_ALGORITHM);
        }
    }
}
