import { FastAuthSigner, SignatureRequest } from "@fast-auth/browser-sdk";
import { JavascriptProvider } from "@fast-auth/javascript-provider";
import { FirebaseProvider } from "@fast-auth/firebase-provider";

export type FastAuthProviderType = JavascriptProvider | FirebaseProvider;
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
