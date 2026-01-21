import { SignatureRequest } from "../signer/types";

export interface ISignerFastAuthProvider {
    isLoggedIn(): Promise<boolean>;
    requestTransactionSignature(...args: any[]): Promise<void>;
    requestDelegateActionSignature(...args: any[]): Promise<void>;
    getSignatureRequest(): Promise<SignatureRequest>;
    getPath(): Promise<string>;
}

export interface IFastAuthProvider extends ISignerFastAuthProvider {
    login(...args: any[]): void;
    logout(...args: any[]): void;
}
