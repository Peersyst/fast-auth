export type CreateAccountOptions = {
    gas?: bigint;
    deposit?: bigint;
};

export type SignatureRequest = {
    guardId: string;
    verifyPayload: string;
    signPayload: string;
};

export type RequestSignatureOptions = {
    redirectUri: string;
    imageUrl: string;
    name: string;
};
