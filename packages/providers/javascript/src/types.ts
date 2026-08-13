import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";
import { PopupLoginOptions, RedirectLoginOptions } from "@auth0/auth0-spa-js";
import { FastAuthNetwork } from "@shared/core";
import { NEP413Payload } from "./nep413";

export type { FastAuthNetwork } from "@shared/core";

export type JavascriptProviderOptions = {
    network: FastAuthNetwork;
    clientId: string;
    domain?: string;
    signingAudience?: string;
};

export type JavascriptLoginWithRedirectOptions = Omit<RedirectLoginOptions, "authorizationParams"> & {
    redirectUri: string;
};

export type JavascriptLoginWithPopupOptions = Omit<PopupLoginOptions, "authorizationParams">;

export type JavascriptLoginOptions = JavascriptLoginWithRedirectOptions | JavascriptLoginWithPopupOptions;

export type JavascriptBaseRequestSignatureOptions = {
    redirectUri?: string;
};

export type JavascriptBaseRequestTransactionSignatureOptions = JavascriptBaseRequestSignatureOptions & {
    transaction: Transaction;
};

export type JavascriptRequestTransactionSignatureWithRedirectOptions = JavascriptBaseRequestTransactionSignatureOptions &
    Omit<RedirectLoginOptions, "authorizationParams">;

export type JavascriptRequestTransactionSignatureWithPopupOptions = JavascriptBaseRequestTransactionSignatureOptions &
    Omit<PopupLoginOptions, "authorizationParams">;

export type JavascriptRequestTransactionSignatureOptions =
    | JavascriptRequestTransactionSignatureWithRedirectOptions
    | JavascriptRequestTransactionSignatureWithPopupOptions;

export type JavascriptBaseRequestDelegateActionSignatureOptions = JavascriptBaseRequestSignatureOptions & {
    delegateAction: DelegateAction;
};

export type JavascriptRequestDelegateActionSignatureWithRedirectOptions = JavascriptBaseRequestDelegateActionSignatureOptions &
    Omit<RedirectLoginOptions, "authorizationParams">;

export type JavascriptRequestDelegateActionSignatureWithPopupOptions = JavascriptBaseRequestDelegateActionSignatureOptions &
    Omit<PopupLoginOptions, "authorizationParams">;

export type JavascriptRequestDelegateActionSignatureOptions =
    | JavascriptRequestDelegateActionSignatureWithRedirectOptions
    | JavascriptRequestDelegateActionSignatureWithPopupOptions;

export type JavascriptBaseRequestMessageSignatureOptions = JavascriptBaseRequestSignatureOptions & {
    /**
     * The NEP-413 payload to sign.
     */
    payload: NEP413Payload;
};

export type JavascriptRequestMessageSignatureWithRedirectOptions = JavascriptBaseRequestMessageSignatureOptions &
    Omit<RedirectLoginOptions, "authorizationParams">;

export type JavascriptRequestMessageSignatureWithPopupOptions = JavascriptBaseRequestMessageSignatureOptions &
    Omit<PopupLoginOptions, "authorizationParams">;

export type JavascriptRequestMessageSignatureOptions =
    | JavascriptRequestMessageSignatureWithRedirectOptions
    | JavascriptRequestMessageSignatureWithPopupOptions;
