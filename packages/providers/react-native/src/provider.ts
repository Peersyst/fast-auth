import Auth0, { WebAuthorizeParameters } from "react-native-auth0";
import {
    ReactNativeProviderOptions,
    ReactNativeRequestDelegateActionSignatureOptions,
    ReactNativeRequestTransactionSignatureOptions,
} from "./types";
import { encodeDelegateAction, encodeTransaction } from "./utils";
import { decodeJwt } from "jose";
import { ReactNativeProviderError, ReactNativeProviderErrorCodes } from "./errors";
import { IFastAuthProvider } from "./core/provider/types";
import { SignatureRequest } from "./core";

/**
 * ReactNativeProvider adapts react-native-auth0 to the FastAuth provider interface.
 * 
 * This provider handles authentication and signature requests for React Native applications
 * using Auth0 as the identity provider.
 * 
 * @example
 * ```typescript
 * const provider = new ReactNativeProvider({
 *   domain: 'your-domain.auth0.com',
 *   clientId: 'your-client-id',
 *   audience: 'your-api-identifier',
 * });
 * ```
 */
export class ReactNativeProvider implements IFastAuthProvider {
    private readonly options: ReactNativeProviderOptions;
    private client: Auth0;

    constructor(options: ReactNativeProviderOptions) {
        this.options = options;
        this.client = new Auth0(options);
    }

    /**
     * Check if the user is signed in by verifying if valid credentials exist.
     * 
     * @returns Promise resolving to true if the user has valid credentials, false otherwise.
     */
    async isLoggedIn(): Promise<boolean> {
        try {
            // Check if we have valid credentials stored
            const credentials = await this.client.credentialsManager.getCredentials();
            return !!credentials;
        } catch (e: unknown) {
            console.log("error", e);
            return false;
        }
    }

    /**
     * Sign in to the client using Web Authentication.
     * 
     * This method initiates the OAuth flow using the system browser.
     * After successful authentication, credentials will be stored automatically.
     * 
     * @returns Promise that resolves when login is complete
     */
    async login(): Promise<void> {

        const authorizeParams: WebAuthorizeParameters = {
    
        };
        // Add audience if provided
        if (this.options.audience) {
            authorizeParams.audience = this.options.audience;
        }

        const credentials = await this.client.webAuth.authorize(authorizeParams);
        await this.client.credentialsManager.saveCredentials(credentials);
    }

    /**
     * Log out of the client and clear stored credentials.
     * 
     * This method will clear the session both locally and on Auth0's servers.
     * 
     * @returns Promise that resolves when logout is complete
     */
    async logout(): Promise<void> {
        try {
            // Clear the session on Auth0's servers
            await this.client.webAuth.clearSession();
            
            // Clear local credentials
            await this.client.credentialsManager.clearCredentials();
        } catch (error) {
            // Even if clearing the remote session fails, clear local credentials
            await this.client.credentialsManager.clearCredentials();
            throw error;
        }
    }

    /**
     * Get the path for the user.
     * 
     * The path is constructed from the JWT token's subject claim and the Auth0 domain.
     * Format: `jwt#https://{domain}/#${sub}`
     * 
     * @returns Promise resolving to the user's path
     * @throws ReactNativeProviderError if user is not logged in or token is invalid
     */
    async getPath(): Promise<string> {
        const credentials = await this.client.credentialsManager.getCredentials();
        
        if (!credentials || !credentials.idToken) {
            throw new ReactNativeProviderError(ReactNativeProviderErrorCodes.CREDENTIALS_NOT_FOUND);
        }

        const { sub } = decodeJwt(credentials.idToken);
        
        if (!sub) {
            throw new ReactNativeProviderError(ReactNativeProviderErrorCodes.INVALID_TOKEN);
        }
        
        return `jwt#https://${this.options.domain}/#${sub}`;
    }

    /**
     * Request a transaction signature from the user.
     * 
     * This method initiates a new authorization flow with the transaction data
     * encoded in the authorization parameters. After the user approves the transaction
     * in the Auth0 flow, the signature can be retrieved using `getSignatureRequest()`.
     * 
     * @param requestSignatureOptions Options for the transaction signature request
     * @returns Promise that resolves when the authorization flow is initiated
     */
    async requestTransactionSignature(
        requestSignatureOptions: ReactNativeRequestTransactionSignatureOptions
    ): Promise<void> {
        const { imageUrl, name, transaction } = requestSignatureOptions;

        const transactionString = encodeTransaction(transaction).toString();

        const authorizeParams: WebAuthorizeParameters = {
            additionalParameters: {
                image_url: imageUrl,
                name,
                transaction: transactionString,
            },
        };

        // Add audience if provided
        if (this.options.audience) {
            authorizeParams.audience = this.options.audience;
        }

        const credentials = await this.client.webAuth.authorize(authorizeParams);
        await this.client.credentialsManager.saveCredentials(credentials);
    }

    /**
     * Request a delegate action signature from the user.
     * 
     * This method initiates a new authorization flow with the delegate action data
     * encoded in the authorization parameters. After the user approves the delegate action
     * in the Auth0 flow, the signature can be retrieved using `getSignatureRequest()`.
     * 
     * @param options Options for the delegate action signature request
     * @returns Promise that resolves when the authorization flow is initiated
     */
    async requestDelegateActionSignature(
        options: ReactNativeRequestDelegateActionSignatureOptions
    ): Promise<void> {
        const { imageUrl, name, delegateAction } = options;

        const authorizeParams: WebAuthorizeParameters = {
            additionalParameters: {
                image_url: imageUrl,
                name,
                delegate_action: encodeDelegateAction(delegateAction).toString(),
            },
        };

        // Add audience if provided
        if (this.options.audience) {
            authorizeParams.audience = this.options.audience;
        }

        const credentials = await this.client.webAuth.authorize(authorizeParams);
        await this.client.credentialsManager.saveCredentials(credentials);
    }

    /**
     * Get the signature request from the current session.
     * 
     * This method retrieves the access token and decodes it to extract the
     * signature payload. The token itself serves as the verify payload.
     * 
     * @returns Promise resolving to the signature request containing:
     *   - guardId: The JWT guard identifier
     *   - verifyPayload: The access token (used for verification)
     *   - signPayload: The transaction/delegate action payload to sign
     * @throws ReactNativeProviderError if credentials are not found
     */
    async getSignatureRequest(): Promise<SignatureRequest> {
        const credentials = await this.client.credentialsManager.getCredentials();
        
        if (!credentials || !credentials.accessToken) {
            throw new ReactNativeProviderError(ReactNativeProviderErrorCodes.CREDENTIALS_NOT_FOUND);
        }

        const decoded = decodeJwt(credentials.accessToken);
        
        return {
            guardId: `jwt#https://${this.options.domain}/`,
            verifyPayload: credentials.accessToken,
            signPayload: decoded["fatxn"] as Uint8Array,
        };
    }
}

