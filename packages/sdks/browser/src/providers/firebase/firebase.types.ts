import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";

export type FirebaseProviderOptions = {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    redirectUri: string;
    issuerUrl: string;
};

export type FirebaseBaseRequestSignatureOptions = {
    imageUrl: string;
    name: string;
    redirectUri?: string;
};

export type FirebaseRequestTransactionSignatureOptions = FirebaseBaseRequestSignatureOptions & {
    transaction: Transaction;
};

export type FirebaseRequestDelegateActionSignatureOptions = FirebaseBaseRequestSignatureOptions & {
    delegateAction: DelegateAction;
};

export type ProviderType = "google" | "apple";