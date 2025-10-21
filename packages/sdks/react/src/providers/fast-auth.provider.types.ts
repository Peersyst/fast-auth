import { PropsWithChildren, ReactNode } from "react";
import { 
    CreateSignActionOptions, 
    FastAuthClient, 
    FastAuthClientOptions, 
    FastAuthSignature, 
    FastAuthSigner,
    IFastAuthProvider, 
    SignatureRequest 
} from "../core";
import { Connection } from "near-api-js";
import { Action, Transaction } from "near-api-js/lib/transaction";
import { Algorithm } from "../core/common/signature/types";
import { CreateAccountOptions } from "../core/signers/signer.types";

/**
 * Context value exposed by FastAuthProvider
 */
export interface IFastAuthContext<P extends IFastAuthProvider = IFastAuthProvider> {
    /**
     * The FastAuth client instance. Null until initialized.
     */
    client: FastAuthClient<P> | null;

    /**
     * Whether the client is ready to use
     */
    isReady: boolean;

    /**
     * Whether the user is currently logged in
     */
    isLoggedIn: boolean | null;

    /**
     * Whether an async operation is in progress
     */
    isLoading: boolean;

    /**
     * Current error if any
     */
    error: Error | null;

    /**
     * Sign in to the client
     * @param args Arguments passed to the provider's login method
     */
    login: (...args: Parameters<P["login"]>) => Promise<void> | void;

    /**
     * Log out of the client
     */
    logout: () => Promise<void> | void;

    /**
     * Get the signer instance
     * @returns The FastAuth signer
     */
    getSigner: () => Promise<FastAuthSigner<P>>;

    /**
     * Request a transaction signature from the user
     * @param args Arguments passed to the provider's requestTransactionSignature method
     */
    requestTransactionSignature: (...args: Parameters<P["requestTransactionSignature"]>) => Promise<void>;

    /**
     * Request a delegate action signature from the user
     * @param args Arguments passed to the provider's requestDelegateActionSignature method
     */
    requestDelegateActionSignature: (...args: Parameters<P["requestDelegateActionSignature"]>) => Promise<void>;

    /**
     * Get the current signature request
     * @returns The signature request
     */
    getSignatureRequest: () => Promise<SignatureRequest>;

    /**
     * Get the user's path
     * @returns The user's path
     */
    getPath: () => Promise<string>;

    /**
     * Get the user's public key
     * @param algorithm The algorithm to use (default: "ed25519")
     * @returns The public key
     */
    getPublicKey: (algorithm?: Algorithm) => Promise<any>;

    /**
     * Create a sign action
     * @param request The signature request
     * @param options Options for the sign action
     * @returns The action
     */
    createSignAction: (request: SignatureRequest, options?: CreateSignActionOptions) => Promise<Action>;

    /**
     * Create an account
     * @param accountId The account ID to create
     * @param options Options for account creation
     * @returns The action
     */
    createAccount: (accountId: string, options?: CreateAccountOptions) => Promise<Action>;

    /**
     * Send a signed transaction
     * @param transaction The transaction to send
     * @param signature The signature
     * @param algorithm The algorithm used (default: "ed25519")
     */
    sendTransaction: (transaction: Transaction, signature: FastAuthSignature, algorithm?: Algorithm) => Promise<any>;
}

/**
 * Configuration for the auth provider
 */
export type FastAuthProviderConfig<P extends IFastAuthProvider = IFastAuthProvider> = {
    /**
     * The auth provider implementation (e.g., JavascriptProvider, ReactNativeProvider)
     */
    provider: P;

    /**
     * Optional React provider wrapper for the auth provider
     * (e.g., Auth0Provider for react-native-auth0)
     */
    reactProvider?: (children: ReactNode) => ReactNode;
};

/**
 * Props for FastAuthProvider component
 */
export type FastAuthProviderProps<P extends IFastAuthProvider = IFastAuthProvider> = PropsWithChildren<{
    /**
     * Provider configuration
     */
    providerConfig: FastAuthProviderConfig<P>;

    /**
     * NEAR connection instance
     */
    connection: Connection;

    /**
     * FastAuth client options
     */
    clientOptions: FastAuthClientOptions;

    /**
     * Whether to automatically check login status on mount
     * @default true
     */
    autoCheckLogin?: boolean;
}>;