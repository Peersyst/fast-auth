import { FastAuthSigner, SignatureRequest } from "@fast-auth-near/browser-sdk";
import { JavascriptProvider } from "@fast-auth-near/javascript-provider";

export type FastAuthProviderType = JavascriptProvider;
export type FastAuthSignerType = FastAuthSigner<FastAuthProviderType>;

export interface AuthState {
    isAuthenticated: boolean;
    publicKey: string | null;
    signer: FastAuthSignerType | null;
    error: Error | null;
}

export interface AccountState {
    accountId: string | null;
    isCreated: boolean;
}

export interface TransactionState {
    signatureRequest: SignatureRequest | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signature: any;
    txHash: string | null;
    isSigning: boolean;
    isSending: boolean;
    error: Error | null;
}
