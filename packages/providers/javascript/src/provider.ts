import { Auth0Client } from "@auth0/auth0-spa-js";
import {
    JavascriptProviderOptions,
    JavascriptBaseRequestDelegateActionSignatureOptions,
    JavascriptRequestTransactionSignatureWithPopupOptions,
    JavascriptRequestTransactionSignatureWithRedirectOptions,
    JavascriptRequestTransactionSignatureOptions,
    JavascriptRequestDelegateActionSignatureWithRedirectOptions,
    JavascriptRequestDelegateActionSignatureWithPopupOptions,
    JavascriptLoginOptions,
    JavascriptLoginWithRedirectOptions,
    JavascriptLoginWithPopupOptions,
} from "./types";
import { encodeDelegateAction, encodeTransaction } from "./utils";
import { decodeJwt } from "jose";
import { SignatureRequest } from "./core/signer/types";
import { JavascriptProviderError, JavascriptProviderErrorCodes } from "./errors";
import { IFastAuthProvider } from "./core/provider/types";

export class JavascriptProvider implements IFastAuthProvider {
    private readonly options: JavascriptProviderOptions;
    private client: Auth0Client;

    constructor(options: JavascriptProviderOptions) {
        this.options = options;
        this.client = new Auth0Client({
            domain: this.options.domain,
            clientId: this.options.clientId,
            authorizationParams: {
                audience: this.options.audience,
            },
        });
    }

    /**
     * Check if the user is redirected to the callback URL.
     * @returns True if the user is redirected to the callback URL, false otherwise.
     */
    private async checkRedirectCallback(): Promise<boolean> {
        const query = new URLSearchParams(globalThis.location.search);
        const code = query.get("code");
        const state = query.get("state");

        if (code && state) {
            await this.client.handleRedirectCallback();
            return await this.client.isAuthenticated();
        }
        return false;
    }

    /**
     * Check if the user has a token.
     * @returns True if the user has a token, false otherwise.
     */
    private async checkToken(): Promise<boolean> {
        await this.client.checkSession();
        const token = await this.client.getTokenSilently();
        if (token) {
            return true;
        }
        return false;
    }

    /**
     * Check if the user is signed in.
     * @returns True if the user is signed in, false otherwise.
     */
    async isLoggedIn(): Promise<boolean> {
        try {
            const isAuthenticated = await this.checkRedirectCallback();
            if (isAuthenticated) {
                return true;
            }
        } catch {
            // If redirect callback fails, continue to check token
        }

        try {
            const tokenExists = await this.checkToken();
            if (tokenExists) {
                return true;
            }
        } catch {
            // If token check fails, user is not logged in
        }

        return false;
    }

    /**
     * Login with redirect.
     * @param options The options for the login with redirect.
     * @returns The void.
     */
    private async loginWithRedirect(options: JavascriptLoginWithRedirectOptions): Promise<void> {
        const { redirectUri, ...opts } = options;
        await this.client.loginWithRedirect({
            ...opts,
            authorizationParams: {
                redirect_uri: redirectUri,
            },
        });
    }

    /**
     * Login with popup.
     * @param options The options for the login with popup.
     * @returns The void.
     */
    private async loginWithPopup(options?: JavascriptLoginWithPopupOptions): Promise<void> {
        await this.client.loginWithPopup(options);
    }

    /**
     * Sign in to the client.
     * @param options The options for the login.
     * @returns The void.
     */
    async login(options?: JavascriptLoginOptions): Promise<void> {
        if (options && "redirectUri" in options) {
            await this.loginWithRedirect(options);
        } else {
            await this.loginWithPopup(options);
        }
    }

    /**
     * Log out of the client.
     */
    async logout(): Promise<void> {
        await this.client.logout();
    }

    /**
     * Get the path for the user.
     * @returns The path for the user.
     */
    async getPath(): Promise<string> {
        const token = await this.client.getTokenSilently();
        const { sub } = decodeJwt(token);
        if (!sub) {
            throw new JavascriptProviderError(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        }
        return `jwt#https://${this.options.domain}/#${sub}`;
    }

    /**
     * Request a transaction signature with redirect.
     * @param requestSignatureOptions The options for the request transaction signature with redirect.
     * @returns The void.
     */
    private async requestTransactionSignatureWithRedirect(
        requestSignatureOptions: JavascriptRequestTransactionSignatureWithRedirectOptions,
    ): Promise<void> {
        const { redirectUri, imageUrl, name, transaction, ...opts } = requestSignatureOptions;
        await this.client.loginWithRedirect({
            authorizationParams: {
                image_url: imageUrl,
                name,
                transaction: encodeTransaction(transaction),
                redirect_uri: redirectUri,
            },
            ...opts,
        });
    }

    /**
     * Request a transaction signature with popup.
     * @param requestSignatureOptions The options for the request transaction signature with popup.
     * @returns The void.
     */
    private async requestTransactionSignatureWithPopup(
        requestSignatureOptions: JavascriptRequestTransactionSignatureWithPopupOptions,
    ): Promise<void> {
        const { imageUrl, name, transaction, ...opts } = requestSignatureOptions;
        await this.client.loginWithPopup({
            authorizationParams: {
                image_url: imageUrl,
                name,
                transaction: encodeTransaction(transaction),
            },
            ...opts,
        });
    }

    /**
     * Request a signature from the client.
     * @param requestSignatureOptions The options for the request signature.
     * @returns The signature.
     */
    async requestTransactionSignature(requestSignatureOptions: JavascriptRequestTransactionSignatureOptions): Promise<void> {
        if (requestSignatureOptions.redirectUri) {
            await this.requestTransactionSignatureWithRedirect(requestSignatureOptions);
        } else {
            await this.requestTransactionSignatureWithPopup(requestSignatureOptions);
        }
    }

    /**
     * Request a delegate action signature with redirect.
     * @param requestSignatureOptions The options for the request delegate action signature with redirect.
     * @returns The void.
     */
    private async requestDelegateActionSignatureWithRedirect(
        requestSignatureOptions: JavascriptRequestDelegateActionSignatureWithRedirectOptions,
    ): Promise<void> {
        const { redirectUri, imageUrl, name, delegateAction, ...opts } = requestSignatureOptions;
        await this.client.loginWithRedirect({
            authorizationParams: {
                image_url: imageUrl,
                name,
                redirect_uri: redirectUri,
                delegateAction: encodeDelegateAction(delegateAction),
            },
            ...opts,
        });
    }

    /**
     * Request a delegate action signature with popup.
     * @param requestSignatureOptions The options for the request delegate action signature with popup.
     * @returns The void.
     */
    private async requestDelegateActionSignatureWithPopup(
        requestSignatureOptions: JavascriptRequestDelegateActionSignatureWithPopupOptions,
    ): Promise<void> {
        const { imageUrl, name, delegateAction, ...opts } = requestSignatureOptions;
        await this.client.loginWithPopup({
            authorizationParams: {
                image_url: imageUrl,
                name,
                delegateAction: encodeDelegateAction(delegateAction),
            },
            ...opts,
        });
    }

    /**
     * Request a delegate action signature from the client.
     * @param options The options for the request delegate action signature.
     * @returns The void.
     */
    async requestDelegateActionSignature(options: JavascriptBaseRequestDelegateActionSignatureOptions): Promise<void> {
        if (options.redirectUri) {
            await this.requestDelegateActionSignatureWithRedirect(options);
        } else {
            await this.requestDelegateActionSignatureWithPopup(options);
        }
    }

    /**
     * Get the signature request.
     * @returns The signature request.
     */
    async getSignatureRequest(): Promise<SignatureRequest> {
        const token = await this.client.getTokenSilently();
        const decoded = decodeJwt(token);
        return {
            guardId: `jwt#https://${this.options.domain}/`,
            verifyPayload: token,
            signPayload: decoded["fatxn"] as Uint8Array,
        };
    }
}
