import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";
import { FirebaseOptions } from "firebase/app";
import { Store } from "./store/store";

export type FirebaseProviderOptions = FirebaseOptions & {
    issuerUrl: string;
    customJwtIssuerUrl: string;
    nearRpcUrl: string;
    store?: Store;
};

export type FirebaseBaseRequestSignatureOptions = {};

export type FirebaseRequestTransactionSignatureOptions = FirebaseBaseRequestSignatureOptions & {
    transaction: Transaction;
};

export type FirebaseRequestDelegateActionSignatureOptions = FirebaseBaseRequestSignatureOptions & {
    delegateAction: DelegateAction;
};

export type FirebaseProviderType = "google" | "apple";
