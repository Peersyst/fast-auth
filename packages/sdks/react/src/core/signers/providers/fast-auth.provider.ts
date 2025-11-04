import { SignatureRequest } from "../signer.types";

export interface IFastAuthProvider {
    isLoggedIn(): Promise<boolean>;
    requestTransactionSignature(...args: any[]): Promise<void>;
    requestDelegateActionSignature(...args: any[]): Promise<void>;
    signAndSendTransaction(...args: any[]): Promise<void>;
    signAndSendDelegateAction(...args: any[]): Promise<void>;
    getSignatureRequest(): Promise<SignatureRequest>;
    getPath(): Promise<string>;
}
