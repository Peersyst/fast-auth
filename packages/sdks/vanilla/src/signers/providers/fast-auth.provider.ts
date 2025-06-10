import { SignatureRequest } from "../signer.types";

export interface IFastAuthProvider {
    isLoggedIn(): Promise<boolean>;
    requestTransactionSignature(requestSignatureOptions: any): Promise<void>;
    getSignatureRequest(): Promise<SignatureRequest>;
    getPath(): Promise<string>;
}
