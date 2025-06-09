import { SignatureRequest } from "../signer.types";

export interface IFastAuthProvider<O = Record<string, never>, SR = SignatureRequest> {
    requestSignature(requestSignatureOptions: O): Promise<void>;
    getSignatureRequest(): SR;
}
