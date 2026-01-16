import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";
import { PopupLoginOptions, RedirectLoginOptions } from "@auth0/auth0-spa-js";

export type JavascriptProviderOptions = {
    domain: string;
    clientId: string;
    redirectUri: string;
    audience: string;
};

export type JavascriptLoginWithRedirectOptions = Omit<RedirectLoginOptions, "authorizationParams"> & {
    redirectUri: string;
};

export type JavascriptLoginWithPopupOptions = Omit<PopupLoginOptions, "authorizationParams">;

export type JavascriptLoginOptions = JavascriptLoginWithRedirectOptions | JavascriptLoginWithPopupOptions;

export type JavascriptBaseRequestSignatureOptions = {
    imageUrl: string;
    name: string;
    redirectUri?: string;
};

export type JavascriptBaseRequestTransactionSignatureOptions = JavascriptBaseRequestSignatureOptions & {
    transaction: Transaction;
};

export type JavascriptRequestTransactionSignatureWithRedirectOptions = JavascriptBaseRequestTransactionSignatureOptions & Omit<RedirectLoginOptions, "authorizationParams">

export type JavascriptRequestTransactionSignatureWithPopupOptions = JavascriptBaseRequestTransactionSignatureOptions & Omit<PopupLoginOptions, "authorizationParams">

export type JavascriptRequestTransactionSignatureOptions = JavascriptRequestTransactionSignatureWithRedirectOptions | JavascriptRequestTransactionSignatureWithPopupOptions;

export type JavascriptBaseRequestDelegateActionSignatureOptions = JavascriptBaseRequestSignatureOptions & {
    delegateAction: DelegateAction;
};

export type JavascriptRequestDelegateActionSignatureWithRedirectOptions = JavascriptBaseRequestDelegateActionSignatureOptions & Omit<RedirectLoginOptions, "authorizationParams">

export type JavascriptRequestDelegateActionSignatureWithPopupOptions = JavascriptBaseRequestDelegateActionSignatureOptions & Omit<PopupLoginOptions, "authorizationParams">

export type JavascriptRequestDelegateActionSignatureOptions = JavascriptRequestDelegateActionSignatureWithRedirectOptions | JavascriptRequestDelegateActionSignatureWithPopupOptions