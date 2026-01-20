import { Algorithm } from "../common/signature/types";

export type NearCallOptions = {
    gas?: bigint;
    deposit?: bigint;
};

export type CreateAccountOptions = NearCallOptions & { algorithm?: Algorithm };
export type CreateSignActionOptions = NearCallOptions;

export type MPCContractAlgorithm = "secp256k1" | "eddsa" | "ecdsa";

export type SignatureRequest = {
    guardId: string;
    verifyPayload: string;
    signPayload: Uint8Array;
    algorithm?: MPCContractAlgorithm;
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
