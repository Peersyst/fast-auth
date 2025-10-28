import { SignatureRequest } from "../signer/types";

/**
 * Interface for FastAuth providers
 *
 * Providers must implement this interface to work with the FastAuth SDK.
 * This includes authentication methods, signature requests, and user path retrieval.
 */
export interface IFastAuthProvider {
    /**
     * Check if the user is currently logged in
     * @returns Promise resolving to true if logged in, false otherwise
     */
    isLoggedIn(): Promise<boolean>;

    /**
     * Request a transaction signature from the user
     * @param args Provider-specific arguments for the request
     */
    requestTransactionSignature(...args: any[]): Promise<void>;

    /**
     * Request a delegate action signature from the user
     * @param args Provider-specific arguments for the request
     */
    requestDelegateActionSignature(...args: any[]): Promise<void>;

    /**
     * Get the current signature request
     * @returns Promise resolving to the signature request
     */
    getSignatureRequest(): Promise<SignatureRequest>;

    /**
     * Get the user's path (identifier)
     * @returns Promise resolving to the user's path
     */
    getPath(): Promise<string>;
}
