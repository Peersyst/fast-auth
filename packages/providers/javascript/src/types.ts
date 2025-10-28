import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";

export type JavascriptProviderOptions = {
    domain: string;
    clientId: string;
    redirectUri: string;
    audience: string;
};

export type JavascriptBaseRequestSignatureOptions = {
    imageUrl: string;
    name: string;
    redirectUri?: string;
};

export type JavascriptRequestTransactionSignatureOptions = JavascriptBaseRequestSignatureOptions & {
    transaction: Transaction;
};

export type JavascriptRequestDelegateActionSignatureOptions = JavascriptBaseRequestSignatureOptions & {
    delegateAction: DelegateAction;
};
