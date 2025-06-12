export type MPCSignaturePayload = {
    big_r: {
        affine_point: string;
    };
    s: {
        scalar: string;
    };
    recovery_id: number;
};
