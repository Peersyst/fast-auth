import Auth0, { Credentials, WebAuthorizeParameters } from "react-native-auth0";
import {
    ReactNativeIdTokenClaims,
    LoginResponse,
    ReactNativeProviderOptions,
    RequestDelegateActionSignatureOptions,
    RequestDelegateActionSignatureResponse,
    RequestTransactionSignatureOptions,
    RequestTransactionSignatureResponse,
    ReactNativeResolvedProviderOptions,
    ReactNativeSignatureTokenClaims,
    User,
    GetSignatureRequestResponse,
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
    private readonly options: ReactNativeResolvedProviderOptions;
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
            return !!credentials && credentials.expiresAt > Math.floor(Date.now() / 1000);
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
    async login(forceSelectAccount?: boolean): Promise<LoginResponse> {
        const credentials = await this.client.webAuth.authorize({
            additionalParameters: {
                ...(forceSelectAccount ? { prompt: "login" } : {}),
            },
        });
        const response = this.getUserId(credentials);
        await this.client.credentialsManager.saveCredentials(credentials);
        return response;
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
     * Extract the Auth0 subject claim from credentials.
     * @param credentials The Auth0 credentials returned by login or signing authorization.
     * @returns The user id response derived from the subject claim.
     */
    private getUserId(credentials: Credentials): User {
        const token = credentials.idToken ?? credentials.accessToken;
        if (!token) {
            throw new ReactNativeProviderError(ReactNativeProviderErrorCodes.CREDENTIALS_NOT_FOUND);
        }

        const { sub: userId } = jwt_decode<ReactNativeIdTokenClaims>(token);
        if (!userId) {
            throw new ReactNativeProviderError(ReactNativeProviderErrorCodes.INVALID_SUB);
        }
        return { userId };
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

        const { userId } = this.getUserId(credentials);

        return `jwt#https://${this.options.domain}/#${userId}`;
    }

    /**
     * Request a transaction signature from the user.
     *
     * Issues a short-lived token against the signing audience. The credentials are held
     * in-memory until consumed by getSignatureRequest; they are NOT persisted, so the
     * session credentials in credentialsManager remain untouched.
     * @param _requestSignatureOptions The options containing the transaction to sign.
     * @returns Promise resolving to the user id for the authenticated subject.
     */
    async requestTransactionSignature(
        _requestSignatureOptions: RequestTransactionSignatureOptions,
    ): Promise<RequestTransactionSignatureResponse> {
        const { transaction } = _requestSignatureOptions;
        const transactionString = encodeTransaction(transaction).toString();

        const authorizeParams: WebAuthorizeParameters = {
            audience: this.options.signingAudience,
            scope: "transaction:sign",
            additionalParameters: {
                transaction: transactionString,
            },
        };

        const signingCredentials = await this.client.webAuth.authorize(authorizeParams);
        const response = this.getUserId(signingCredentials);
        this.signingCredentials = signingCredentials;
        return response;
    }

    /**
     * Request a delegate action signature from the user.
     * @param options The options containing the delegate action to sign.
     * @returns Promise resolving to the user id for the authenticated subject.
     */
    async requestDelegateActionSignature(options: RequestDelegateActionSignatureOptions): Promise<RequestDelegateActionSignatureResponse> {
        const { delegateAction } = options;

        const authorizeParams: WebAuthorizeParameters = {
            audience: this.options.signingAudience,
            scope: "transaction:sign",
            additionalParameters: {
                delegateAction: encodeDelegateAction(delegateAction).toString(),
            },
        };

        const signingCredentials = await this.client.webAuth.authorize(authorizeParams);
        const response = this.getUserId(signingCredentials);
        this.signingCredentials = signingCredentials;
        return response;
    }

    /**
     * Get the signature request from the in-memory signing credentials.
     *
     * Consumes the one-shot signing credentials issued by request*Signature. Session
     * credentials in credentialsManager are not touched.
     * @returns Promise resolving to the signature request containing the guard id, verify payload, and sign payload.
     */
    async getSignatureRequest(): Promise<GetSignatureRequestResponse> {
        const credentials = this.signingCredentials;

        if (!credentials || !credentials.accessToken) {
            throw new ReactNativeProviderError(ReactNativeProviderErrorCodes.CREDENTIALS_NOT_FOUND);
        }

        const decoded = jwt_decode<ReactNativeSignatureTokenClaims>(credentials.accessToken);
        if (!decoded.sub) {
            throw new ReactNativeProviderError(ReactNativeProviderErrorCodes.INVALID_SUB);
        }
        const user: User = { userId: decoded.sub };

        const signatureRequest: SignatureRequest = {
            guardId: `jwt#https://${this.options.domain}/`,
            verifyPayload: credentials.accessToken,
            signPayload: Uint8Array.from(decoded.fatxn),
        };

        this.signingCredentials = null;
        return { user, signatureRequest };
    }
}
