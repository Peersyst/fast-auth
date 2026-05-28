import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";
import { FastAuthNetwork } from "@shared/core";

export type { FastAuthNetwork } from "@shared/core";

export type Auth0ProviderOptions = {
    network: FastAuthNetwork;
    clientId: string;
    redirectUri: string;
    domain?: string;
    audience?: string;
    signingAudience?: string;
};

export type Auth0BaseRequestSignatureOptions = {
    redirectUri?: string;
};

export type Auth0RequestTransactionSignatureOptions = Auth0BaseRequestSignatureOptions & {
    transaction: Transaction;
};

export type Auth0RequestDelegateActionSignatureOptions = Auth0BaseRequestSignatureOptions & {
    delegateAction: DelegateAction;
};
