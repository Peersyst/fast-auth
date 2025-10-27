import { FastAuthSignature } from "../../../src/common/signature/signature";
import { FastAuthSignatureError } from "../../../src/common/signature/signature.errors";
import { ED25519ErrorCodes, SECP256K1ErrorCodes, SignatureErrorCodes } from "../../../src/common/signature/signature.error-codes";

describe("FastAuthSignature", () => {
    describe("fromBase64", () => {
        it("should parse base64 payload and construct instance", () => {
            const payload = { signature: new Array(64).fill(1) };
            const base64 = Buffer.from(JSON.stringify(payload)).toString("base64");
            const sig = FastAuthSignature.fromBase64(base64);
            expect(() => sig.recover("ed25519")).not.toThrow();
        });
    });

    describe("recover - ed25519", () => {
        it("should return 64 bytes when payload contains signature array", () => {
            const payload = { signature: new Array(64).fill(7) } as any;
            const sig = new FastAuthSignature(payload);
            const recovered = sig.recover("ed25519");
            expect(recovered).toBeInstanceOf(Buffer);
            expect(recovered.length).toBe(64);
        });

        it("should throw when signature array length is not 64", () => {
            const payload = { signature: new Array(10).fill(1) } as any;
            const sig = new FastAuthSignature(payload);
            expect(() => sig.recover("ed25519")).toThrow(FastAuthSignatureError);
            expect(() => sig.recover("ed25519")).toThrow(ED25519ErrorCodes.INVALID_ED25519_SIGNATURE_LENGTH);
        });

        it("should reconstruct 64 bytes from ECDSA-like shape (R,S)", () => {
            // Use secp256k1 generator compressed point for big_r; we only use X for ed logic
            const compressedG = "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
            const s = "22".repeat(32);
            const payload = { big_r: { affine_point: compressedG }, s: { scalar: s } } as any;
            const sig = new FastAuthSignature(payload);
            const recovered = sig.recover("ed25519");
            expect(recovered.length).toBe(64);
        });

        it("should throw for invalid ECDSA-like ed25519 payload", () => {
            const payload = { big_r: {}, s: {} } as any;
            const sig = new FastAuthSignature(payload);
            expect(() => sig.recover("ed25519")).toThrow(FastAuthSignatureError);
            expect(() => sig.recover("ed25519")).toThrow(ED25519ErrorCodes.INVALID_ED25519_PAYLOAD);
        });
    });

    describe("recover - secp256k1", () => {
        it("should return 65 bytes (r||s||v) for valid payload", () => {
            const compressedG = "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
            const s = "11".repeat(32);
            const payload = { big_r: { affine_point: compressedG }, s: { scalar: s }, recovery_id: 1 } as any;
            const sig = new FastAuthSignature(payload);
            const recovered = sig.recover("secp256k1");
            expect(recovered.length).toBe(65);
        });

        it("should throw for invalid payload (missing fields)", () => {
            const payload = { big_r: {}, s: {} } as any;
            const sig = new FastAuthSignature(payload);
            expect(() => sig.recover("secp256k1")).toThrow(FastAuthSignatureError);
            expect(() => sig.recover("secp256k1")).toThrow(SECP256K1ErrorCodes.INVALID_SECP256K1_PAYLOAD);
        });
    });

    describe("recover - unsupported algorithm", () => {
        it("should throw UNSUPPORTED_ALGORITHM error", () => {
            const payload = { signature: new Array(64).fill(0) } as any;
            const sig = new FastAuthSignature(payload);
            expect(() => sig.recover("unknown" as any)).toThrow(FastAuthSignatureError);
            expect(() => sig.recover("unknown" as any)).toThrow(SignatureErrorCodes.UNSUPPORTED_ALGORITHM);
        });
    });
});
