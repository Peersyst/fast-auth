import { Auth0Client } from "@auth0/auth0-spa-js";
import {
    JavascriptProviderOptions,
    JavascriptRequestDelegateActionSignatureOptions,
    JavascriptRequestTransactionSignatureOptions,
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
                redirect_uri: this.options.redirectUri,
            },
        });
    }

    /**
     * Check if the user is signed in.
     * @returns True if the user is signed in, false otherwise.
     */
    async isLoggedIn(): Promise<boolean> {
        try {
            const query = new URLSearchParams(globalThis.location.search);
            const code = query.get("code");
            const state = query.get("state");

            if (code && state) {
                await this.client.handleRedirectCallback();
                return await this.client.isAuthenticated();
            }
            return false;
        } catch (_: unknown) {
            return false;
        }
    }

    /**
     * Sign in to the client.
     * @returns The void.
     */
    async login(): Promise<void> {
        await this.client.loginWithRedirect({
            authorizationParams: {
                redirect_uri: this.options.redirectUri,
            },
        });
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
     * Request a signature from the client.
     * @param requestSignatureOptions The options for the request signature.
     * @returns The signature.
     */
    async requestTransactionSignature(requestSignatureOptions: JavascriptRequestTransactionSignatureOptions): Promise<void> {
        const { redirectUri, imageUrl, name, transaction } = requestSignatureOptions;

        await this.client.loginWithRedirect({
            authorizationParams: {
                image_url: imageUrl,
                name,
                redirect_uri: redirectUri ?? this.options.redirectUri,
                transaction: encodeTransaction(transaction),
            },
        });
    }

    /**
     * Request a delegate action signature from the client.
     * @param options The options for the request delegate action signature.
     * @returns The void.
     */
    async requestDelegateActionSignature(options: JavascriptRequestDelegateActionSignatureOptions): Promise<void> {
        const { redirectUri, imageUrl, name, delegateAction } = options;

        await this.client.loginWithRedirect({
            authorizationParams: {
                image_url: imageUrl,
                name,
                redirect_uri: redirectUri ?? this.options.redirectUri,
                delegateAction: encodeDelegateAction(delegateAction),
            },
        });
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
