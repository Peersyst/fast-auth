import { Transaction } from "near-api-js/lib/transaction";
import { Algorithm } from "../common/signature/types";
import { IFastAuthProvider } from "./providers";

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

export type SignAndSendTransactionOptions<P extends IFastAuthProvider = IFastAuthProvider> = Parameters<
    P["requestTransactionSignature"]
> & {
    algorithm?: MPCContractAlgorithm;
    transaction: Transaction;
};

export type SignAndSendDelegateActionOptions<P extends IFastAuthProvider = IFastAuthProvider> = Parameters<
    P["requestDelegateActionSignature"]
> & {
    algorithm?: MPCContractAlgorithm;
    receiverId: string;
};
