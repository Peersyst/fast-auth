import {
    GetSignatureRequestResponse,
    LoginResponse,
    RequestDelegateActionSignatureOptions,
    RequestDelegateActionSignatureResponse,
    RequestTransactionSignatureOptions,
    RequestTransactionSignatureResponse,
} from "../../types";

/**
 * Interface for FastAuth providers
 *
 * Providers must implement this interface to work with the FastAuth SDK.
 * This includes authentication methods, signature requests, and user path retrieval.
 */
export interface IFastAuthProvider {
    /**
     * Sign in to the client
     * @param forceSelectAccount Whether to force account selection
     */
    login(forceSelectAccount?: boolean): Promise<LoginResponse>;

    /**
     * Check if the user is currently logged in
     * @returns Promise resolving to true if logged in, false otherwise
     */
    isLoggedIn(): Promise<boolean>;

    /**
     * Request a transaction signature from the user
     * @param options The options for the request
     */
    requestTransactionSignature(options: RequestTransactionSignatureOptions): Promise<RequestTransactionSignatureResponse>;

    /**
     * Request a delegate action signature from the user
     * @param options The options for the request
     */
    requestDelegateActionSignature(options: RequestDelegateActionSignatureOptions): Promise<RequestDelegateActionSignatureResponse>;

    /**
     * Get the current signature request
     * @returns Promise resolving to the signature request
     */
    getSignatureRequest(): Promise<GetSignatureRequestResponse>;

    /**
     * Get the user's path (identifier)
     * @returns Promise resolving to the user's path
     */
    getPath(): Promise<string>;
}
