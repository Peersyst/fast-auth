import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";

export type Auth0ProviderOptions = {
    domain: string;
    clientId: string;
    redirectUri: string;
    audience: string;
};

export type Auth0BaseRequestSignatureOptions = {
    imageUrl: string;
    name: string;
    redirectUri?: string;
};

export type Auth0RequestTransactionSignatureOptions = Auth0BaseRequestSignatureOptions & {
    transaction: Transaction;
};

export type Auth0RequestDelegateActionSignatureOptions = Auth0BaseRequestSignatureOptions & {
    delegateAction: DelegateAction;
};
