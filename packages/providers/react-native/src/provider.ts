import Auth0, { Credentials, WebAuthorizeParameters } from "react-native-auth0";
import {
    ReactNativeProviderOptions,
    ReactNativeRequestDelegateActionSignatureOptions,
    ReactNativeRequestTransactionSignatureOptions,
} from "./types";
import { FAST_AUTH_AUTH0_DEFAULTS } from "@shared/core";
import { encodeDelegateAction, encodeTransaction } from "./utils";
import jwt_decode from "jwt-decode";
import { ReactNativeProviderError, ReactNativeProviderErrorCodes } from "./errors";
import { IFastAuthProvider } from "./core/provider/types";
import { SignatureRequest } from "./core";

/**
 * ReactNativeProvider adapts react-native-auth0 to the FastAuth provider interface.
 *
 * This provider handles authentication and signature requests for React Native applications
 * using Auth0 as the identity provider.
 *
 */
export class ReactNativeProvider implements IFastAuthProvider {
    private readonly options: ReactNativeProviderOptions & {
        domain: string;
        signingAudience: string;
    };
    private client: Auth0;
    // Signing credentials are kept in-memory only and consumed once by getSignatureRequest.
    // Session credentials live in the persistent credentialsManager.
    private signingCredentials: Credentials | null = null;

    constructor(options: ReactNativeProviderOptions) {
        const defaults = FAST_AUTH_AUTH0_DEFAULTS[options.network];
        this.options = {
            network: options.network,
            clientId: options.clientId,
            domain: options.domain ?? defaults.domain,
            signingAudience: options.signingAudience ?? defaults.signingAudience,
        };
        this.client = new Auth0({ domain: this.options.domain, clientId: this.options.clientId });
    }

    /**
     * Check if the user is signed in by verifying if valid session credentials exist.
     * @returns Promise resolving to true if the user has valid credentials, false otherwise.
     */
    async isLoggedIn(): Promise<boolean> {
        try {
            const credentials = await this.client.credentialsManager.getCredentials();
            return !!credentials;
        } catch {
            return false;
        }
    }

    /**
     * Sign in to the client using Web Authentication.
     *
     * Persists the session credentials via credentialsManager.
     * @param forceSelectAccount Whether to force the user to reselect account.
     * @returns Promise that resolves when login is complete.
     */
    async login(forceSelectAccount?: boolean): Promise<void> {
        const credentials = await this.client.webAuth.authorize({
            additionalParameters: {
                ...(forceSelectAccount ? { prompt: "login" } : {}),
            },
        });
        await this.client.credentialsManager.saveCredentials(credentials);
    }

    /**
     * Log out of the client and clear stored credentials.
     */
    async logout(): Promise<void> {
        this.signingCredentials = null;
        try {
            await this.client.webAuth.clearSession();
            await this.client.credentialsManager.clearCredentials();
        } catch (error) {
            await this.client.credentialsManager.clearCredentials();
            throw error;
        }
    }

    /**
     * Get the path for the user.
     *
     * The path is constructed from the session id token's subject claim and the Auth0 domain.
     * Format: `jwt#https://{domain}/#${sub}`
     * @returns Promise resolving to the user's path string.
     */
    async getPath(): Promise<string> {
        const credentials = await this.client.credentialsManager.getCredentials();

        if (!credentials || !credentials.idToken) {
            throw new ReactNativeProviderError(ReactNativeProviderErrorCodes.CREDENTIALS_NOT_FOUND);
        }

        const { sub } = jwt_decode<{ sub?: string }>(credentials.idToken);

        if (!sub) {
            throw new ReactNativeProviderError(ReactNativeProviderErrorCodes.INVALID_TOKEN);
        }

        return `jwt#https://${this.options.domain}/#${sub}`;
    }

    /**
     * Request a transaction signature from the user.
     *
     * Issues a short-lived token against the signing audience. The credentials are held
     * in-memory until consumed by getSignatureRequest; they are NOT persisted, so the
     * session credentials in credentialsManager remain untouched.
     * @param _requestSignatureOptions The options containing the transaction to sign.
     */
    async requestTransactionSignature(_requestSignatureOptions: ReactNativeRequestTransactionSignatureOptions): Promise<void> {
        const { transaction } = _requestSignatureOptions;
        const transactionString = encodeTransaction(transaction).toString();

        const authorizeParams: WebAuthorizeParameters = {
            audience: this.options.signingAudience,
            scope: "transaction:sign",
            additionalParameters: {
                transaction: transactionString,
            },
        };

        this.signingCredentials = await this.client.webAuth.authorize(authorizeParams);
    }

    /**
     * Request a delegate action signature from the user.
     * @param options The options containing the delegate action to sign.
     */
    async requestDelegateActionSignature(options: ReactNativeRequestDelegateActionSignatureOptions): Promise<void> {
        const { delegateAction } = options;

        const authorizeParams: WebAuthorizeParameters = {
            audience: this.options.signingAudience,
            scope: "transaction:sign",
            additionalParameters: {
                delegateAction: encodeDelegateAction(delegateAction).toString(),
            },
        };

        this.signingCredentials = await this.client.webAuth.authorize(authorizeParams);
    }

    /**
     * Get the signature request from the in-memory signing credentials.
     *
     * Consumes the one-shot signing credentials issued by request*Signature. Session
     * credentials in credentialsManager are not touched.
     * @returns Promise resolving to the signature request containing the guard id, verify payload, and sign payload.
     */
    async getSignatureRequest(): Promise<SignatureRequest> {
        const credentials = this.signingCredentials;

        if (!credentials || !credentials.accessToken) {
            throw new ReactNativeProviderError(ReactNativeProviderErrorCodes.CREDENTIALS_NOT_FOUND);
        }

        const decoded = jwt_decode<{ fatxn: Uint8Array }>(credentials.accessToken);

        this.signingCredentials = null;

        return {
            guardId: `jwt#https://${this.options.domain}/`,
            verifyPayload: credentials.accessToken,
            signPayload: decoded["fatxn"] as Uint8Array,
        };
    }
}
