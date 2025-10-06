export type EcdsaSignaturePayload = {
    scheme: string;
    big_r: {
        affine_point: string;
    };
    s: {
        scalar: string;
    };
    recovery_id: number;
};

export type EdDsaSignaturePayload = {
    scheme: string;
    signature: number[]; // 64 bytes
};

export type MPCSignaturePayload = EcdsaSignaturePayload | EdDsaSignaturePayload;
