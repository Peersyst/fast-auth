export type CreateAccountOptions = {
    gas?: bigint;
    deposit?: bigint;
};

export type SignatureRequest = {
    guardId: string;
    verifyPayload: string;
    signPayload: Uint8Array;
    algorithm?: "secp256k1" | "ecdsa";
};

export type RequestSignatureOptions = {
    redirectUri: string;
    imageUrl: string;
    name: string;
};

export type FastAuthSignerOptions = {
    mpcContractId: string;
    fastAuthContractId: string;
};
