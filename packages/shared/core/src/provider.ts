/**
 * Auth response containing the deterministic user identifier
 */
export type User = {
    userId: string;
};

/**
 * Response returned after a successful login
 */
export type LoginResponse = User;

/**
 * Response returned after a successful transaction signature request
 */
export type RequestTransactionSignatureResponse = User;

/**
 * Response returned after a successful delegate action signature request
 */
export type RequestDelegateActionSignatureResponse = User;

/**
 * Response of a NEP-413 message signature request.
 */
export type RequestMessageSignatureResponse = User;

/**
 * Response returned after a successful signature request
 */
export type GetSignatureRequestResponse = { user: User; signatureRequest: SignatureRequest };

export interface IFastAuthProvider {
    login(...args: any[]): Promise<LoginResponse>;
    logout(...args: any[]): Promise<void>;
    isLoggedIn(): Promise<boolean>;
    requestTransactionSignature(...args: any[]): Promise<RequestTransactionSignatureResponse>;
    requestDelegateActionSignature(...args: any[]): Promise<RequestDelegateActionSignatureResponse>;
    /**
     * Request a signature over a NEP-413 off-chain message: wallet sign-in challenges, app
     * authentication, or NEAR Intents authorized without submitting a transaction. Optional:
     * providers that have not implemented the flow simply omit it, and callers must check for
     * its presence before use.
     */
    requestMessageSignature?(...args: any[]): Promise<RequestMessageSignatureResponse>;
    getSignatureRequest(): Promise<GetSignatureRequestResponse>;
    getPath(): Promise<string>;
}

/**
 * MPC contract algorithm types
 */
export type MPCContractAlgorithm = "secp256k1" | "eddsa" | "ecdsa";

/**
 * Signature request structure
 */
export type SignatureRequest = {
    /**
     * The guard ID (JWT provider identifier)
     */
    guardId: string;

    /**
     * The payload to verify (typically a JWT token)
     */
    verifyPayload: string;

    /**
     * The payload to sign (transaction data)
     */
    signPayload: Uint8Array;

    /**
     * The algorithm to use for signing
     */
    algorithm?: MPCContractAlgorithm;
};
