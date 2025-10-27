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

