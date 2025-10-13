export type ECDSASignaturePayload = {
    scheme: string;
    big_r: {
        affine_point: string;
    };
    s: {
        scalar: string;
    };
    recovery_id: number;
};

export type EDDSASignaturePayload = {
    scheme: string;
    signature: number[]; // 64 bytes
};

export type MPCSignaturePayload = ECDSASignaturePayload | EDDSASignaturePayload;


export type Algorithm = "secp256k1" | "ed25519";