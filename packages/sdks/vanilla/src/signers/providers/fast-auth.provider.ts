import { SignatureRequest } from "../signer.types";

export interface IFastAuthProvider {
    isLoggedIn(): Promise<boolean>;
    requestTransactionSignature(options: any): Promise<void>;
    requestDelegateActionSignature(options: any): Promise<void>;
    getSignatureRequest(): Promise<SignatureRequest>;
    getPath(): Promise<string>;
}
