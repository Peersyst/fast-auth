import { Auth0Client, LogoutOptions } from "@auth0/auth0-spa-js";
import {
    JavascriptProviderOptions,
    JavascriptRequestDelegateActionSignatureOptions,
    JavascriptRequestSignatureLoginOptions,
    JavascriptRequestTransactionSignatureOptions,
    JavascriptLoginOptions,
    JavascriptLoginWithRedirectOptions,
    JavascriptLoginWithPopupOptions,
    JavascriptRequestMessageSignatureOptions,
} from "./types";
import {
    encodeSignMessage,
    FAST_AUTH_AUTH0_DEFAULTS,
    GetSignatureRequestResponse,
    IFastAuthProvider,
    LoginResponse,
    RequestDelegateActionSignatureResponse,
    RequestMessageSignatureResponse,
    RequestTransactionSignatureResponse,
    User,
} from "@shared/core";
import { encodeDelegateAction, encodeTransaction } from "./utils";
import jwt_decode from "jwt-decode";
import { JavascriptProviderError, JavascriptProviderErrorCodes } from "./errors";

type SignaturePayload = { transaction: number[] } | { delegateAction: number[] } | { nep413: number[] };

export class JavascriptProvider implements IFastAuthProvider {
    private readonly options: JavascriptProviderOptions & {
        domain: string;
        signingAudience: string;
    };
    private client: Auth0Client;

    constructor(options: JavascriptProviderOptions) {
        const defaults = FAST_AUTH_AUTH0_DEFAULTS[options.network];
        this.options = {
            network: options.network,
            clientId: options.clientId,
            domain: options.domain ?? defaults.domain,
            signingAudience: options.signingAudience ?? defaults.signingAudience,
        };
        this.client = new Auth0Client({
            domain: this.options.domain,
            clientId: this.options.clientId,
            authorizationParams: {},
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
            // If redirect callback fails, keep the app in the logged-out state.
        }

        try {
            return await this.client.isAuthenticated();
        } catch {
            return false;
        }
    }

    /**
     * Login with redirect.
     * @param options The options for the login with redirect.
     * @param forceSelectAccount Wheter to force the user to reselect account.
     * @returns The void.
     */
    private async loginWithRedirect(options: JavascriptLoginWithRedirectOptions, forceSelectAccount?: boolean): Promise<void> {
        const { redirectUri, ...opts } = options;
        await this.client.loginWithRedirect({
            ...opts,
            authorizationParams: {
                prompt: forceSelectAccount ? "login" : undefined,
                redirect_uri: redirectUri,
            },
        });
    }

    /**
     * Login with popup.
     * @param options The options for the login with popup.
     * @param forceSelectAccount Wheter to force the user to reselect account.
     * @returns The void.
     */
    private async loginWithPopup(options?: JavascriptLoginWithPopupOptions, forceSelectAccount?: boolean): Promise<void> {
        const { ...opts } = options ?? {};

        await this.client.loginWithPopup({
            ...opts,
            authorizationParams: {
                prompt: forceSelectAccount ? "login" : undefined,
            },
        });
    }

    /**
     * Retrieves the user ID (sub) from the ID token claims.
     * @returns A promise that resolves to the user ID (sub).
     */
    private async getUserId(): Promise<User> {
        const idToken = await this.client.getIdTokenClaims();
        const sub = (idToken as { sub?: string } | undefined)?.sub;
        if (!sub) {
            throw new JavascriptProviderError(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        }
        return { userId: sub };
    }

    /**
     * Sign in to the client.
     * @param options The options for the login.
     * @param forceSelectAccount Wheter to force the user to reselect account.
     * @returns The void.
     */
    async login(options?: JavascriptLoginOptions, forceSelectAccount?: boolean): Promise<LoginResponse> {
        if (options && "redirectUri" in options) {
            await this.loginWithRedirect(options, forceSelectAccount);
        } else {
            await this.loginWithPopup(options, forceSelectAccount);
        }
        return this.getUserId();
    }

    /**
     * Log out of the client.
     * @param options The options for the logout.
     */
    async logout(options?: LogoutOptions): Promise<void> {
        await this.client.logout(options);
    }

    /**
     * Get the path for the user.
     * @returns The path for the user.
     */
    async getPath(): Promise<string> {
        const { userId } = await this.getUserId();
        return `jwt#https://${this.options.domain}/#${userId}`;
    }

    /**
     * Open Auth0 to sign the given payload, by redirect when a redirect URI is set and by popup otherwise.
     * @param options The redirect URI and the Auth0 login options.
     * @param payload The encoded authorization parameters that describe what to sign.
     * @returns The authenticated user.
     */
    private async requestSignature(options: JavascriptRequestSignatureLoginOptions, payload: SignaturePayload): Promise<User> {
        const { redirectUri, ...opts } = options;
        const authorizationParams = {
            audience: this.options.signingAudience,
            scope: "transaction:sign",
            ...payload,
        };
        if (redirectUri) {
            await this.client.loginWithRedirect({
                authorizationParams: { ...authorizationParams, redirect_uri: redirectUri },
                ...opts,
            });
        } else {
            await this.client.loginWithPopup({ authorizationParams, ...opts });
        }
        return this.getUserId();
    }

    /**
     * Request a signature from the client.
     * @param requestSignatureOptions The options for the request signature.
     * @returns The signature.
     */
    async requestTransactionSignature(
        requestSignatureOptions: JavascriptRequestTransactionSignatureOptions,
    ): Promise<RequestTransactionSignatureResponse> {
        const { transaction, ...opts } = requestSignatureOptions;
        return this.requestSignature(opts, { transaction: encodeTransaction(transaction) });
    }

    /**
     * Request a delegate action signature from the client.
     * @param options The options for the request delegate action signature.
     * @returns The void.
     */
    async requestDelegateActionSignature(
        options: JavascriptRequestDelegateActionSignatureOptions,
    ): Promise<RequestDelegateActionSignatureResponse> {
        const { delegateAction, ...opts } = options;
        return this.requestSignature(opts, { delegateAction: encodeDelegateAction(delegateAction) });
    }

    /**
     * Request a NEP-413 message signature from the client.
     * @param options The options for the request message signature.
     * @returns The authenticated user.
     */
    async requestMessageSignature(options: JavascriptRequestMessageSignatureOptions): Promise<RequestMessageSignatureResponse> {
        const { message, recipient, nonce, callbackUrl, ...opts } = options;
        return this.requestSignature(opts, { nep413: encodeSignMessage({ message, recipient, nonce, callbackUrl }) });
    }

    /**
     * Get the signature request.
     * @returns The signature request.
     */
    async getSignatureRequest(): Promise<GetSignatureRequestResponse> {
        const token = await this.client.getTokenSilently({
            authorizationParams: { audience: this.options.signingAudience },
        });
        const decoded = jwt_decode<{ fatxn: Uint8Array }>(token);
        const signatureRequest = {
            guardId: `jwt#https://${this.options.domain}/`,
            verifyPayload: token,
            signPayload: decoded["fatxn"] as Uint8Array,
        };
        const user = await this.getUserId();
        return { user, signatureRequest };
    }
}
