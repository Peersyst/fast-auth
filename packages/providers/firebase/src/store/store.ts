import { SignatureRequest } from "../core";

export interface Store {
    getSignatureRequest(): SignatureRequest | null;
    setSignatureRequest(signatureRequest: SignatureRequest): void;
    clear(): void;
}
