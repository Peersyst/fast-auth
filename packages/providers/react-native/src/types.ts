import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";
import { Auth0Options } from "react-native-auth0";

/**
 * Options for initializing the ReactNativeProvider
 */
export type ReactNativeProviderOptions = Auth0Options & {
    /**
     * The audience for the API (e.g., your API identifier in Auth0)
     */
    audience?: string;
};

/**
 * Base options for requesting signatures
 */
export type ReactNativeBaseRequestSignatureOptions = {
    /**
     * URL of the image to display in the authorization UI
     */
    imageUrl: string;
    
    /**
     * Name of the application requesting the signature
     */
    name: string;
};

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

