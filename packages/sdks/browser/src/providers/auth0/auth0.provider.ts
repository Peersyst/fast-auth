import { Auth0Client } from "@auth0/auth0-spa-js";
import { Auth0ProviderOptions, Auth0RequestDelegateActionSignatureOptions, Auth0RequestTransactionSignatureOptions } from "./auth0.types";
import { encodeDelegateAction, encodeTransaction } from "./utils";
import { decodeJwt } from "jose";
import { SignatureRequest } from "../../signers";
import { Auth0ProviderError } from "./auth0.errors";
import { Auth0ProviderErrorCodes } from "./auth0.error-codes";
import { IFastAuthProvider } from "../../client/providers/fast-auth.provider";

export class Auth0Provider implements IFastAuthProvider {
    private readonly options: Auth0ProviderOptions;
    private client: Auth0Client;

    constructor(options: Auth0ProviderOptions) {
        this.options = options;
        this.client = new Auth0Client({
            domain: this.options.domain,
            clientId: this.options.clientId,
            authorizationParams: {
                audience: this.options.audience,
                redirect_uri: this.options.redirectUri,
            },
        });

        // Initialize the Auth0 client.
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
            throw new Auth0ProviderError(Auth0ProviderErrorCodes.USER_NOT_LOGGED_IN);
        }
        return `jwt#https://${this.options.domain}/#${sub}`;
    }

    /**
     * Request a signature from the client.
     * @param requestSignatureOptions The options for the request signature.
     * @returns The signature.
     */
    async requestTransactionSignature(requestSignatureOptions: Auth0RequestTransactionSignatureOptions): Promise<void> {
        const { redirectUri, imageUrl, name, transaction } = requestSignatureOptions;

        await this.client.loginWithRedirect({
            authorizationParams: {
                imageUrl,
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
    async requestDelegateActionSignature(options: Auth0RequestDelegateActionSignatureOptions): Promise<void> {
        const { redirectUri, imageUrl, name, delegateAction } = options;

        await this.client.loginWithRedirect({
            authorizationParams: {
                imageUrl,
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
