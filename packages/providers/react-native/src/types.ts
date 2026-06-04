import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";
import { FastAuthNetwork } from "@shared/core";

export type { FastAuthNetwork } from "@shared/core";

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
 * Base options for requesting signatures
 */
export type ReactNativeBaseRequestSignatureOptions = Record<string, never>;

/**
 * Options for requesting a transaction signature
 */
export type ReactNativeRequestTransactionSignatureOptions = ReactNativeBaseRequestSignatureOptions & {
    /**
     * The transaction to sign
     */
    transaction: Transaction;
};

/**
 * Options for requesting a delegate action signature
 */
export type ReactNativeRequestDelegateActionSignatureOptions = ReactNativeBaseRequestSignatureOptions & {
    /**
     * The delegate action to sign
     */
    delegateAction: DelegateAction;
};
