import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";
import type { FastAuthNetwork, SignatureRequest } from "@shared/core";

/**
 * Options for initializing the ReactNativeProvider
 */
export type ReactNativeProviderOptions = {
    network: FastAuthNetwork;
    clientId: string;
    domain?: string;
    signingAudience?: string;
};

/**
 * Provider options after applying network defaults
 */
export type ReactNativeResolvedProviderOptions = ReactNativeProviderOptions & {
    domain: string;
    signingAudience: string;
};

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
 * Response returned after a successful signature request
 */
export type GetSignatureRequestResponse = { user: User; signatureRequest: SignatureRequest };

/**
 * Claims expected in Auth0 ID tokens
 */
export type ReactNativeIdTokenClaims = {
    sub?: string;
};

/**
 * Claims expected in Auth0 access tokens issued for signing
 */
export type ReactNativeSignatureTokenClaims = ReactNativeIdTokenClaims & {
    fatxn: ArrayLike<number>;
};

/**
 * Base options for requesting signatures
 */
export type BaseRequestSignatureOptions = Record<never, never>;

/**
 * Options for requesting a transaction signature
 */
export type RequestTransactionSignatureOptions = BaseRequestSignatureOptions & {
    /**
     * The transaction to sign
     */
    transaction: Transaction;
};

/**
 * Options for requesting a delegate action signature
 */
export type RequestDelegateActionSignatureOptions = BaseRequestSignatureOptions & {
    /**
     * The delegate action to sign
     */
    delegateAction: DelegateAction;
};
