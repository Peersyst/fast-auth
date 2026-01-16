import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";
import {FirebaseOptions} from "firebase/app";

export type FirebaseProviderOptions = FirebaseOptions & {
    issuerUrl: string;
};

export type FirebaseBaseRequestSignatureOptions = {};

export type FirebaseRequestTransactionSignatureOptions = FirebaseBaseRequestSignatureOptions & {
    transaction: Transaction;
};

export type FirebaseRequestDelegateActionSignatureOptions = FirebaseBaseRequestSignatureOptions & {
    delegateAction: DelegateAction;
};

export type FirebaseProviderType = "google" | "apple";