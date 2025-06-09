import { Auth0Client } from "@auth0/auth0-spa-js";
import { Auth0ProviderOptions, Auth0RequestSignatureOptions } from "./auth0.types";

export class Auth0Provider {
    private readonly options: Auth0ProviderOptions;
    private client: Auth0Client;

    constructor(options: Auth0ProviderOptions) {
        this.options = options;
        this.client = new Auth0Client({
            domain: this.options.domain,
            clientId: this.options.clientId,
            authorizationParams: {
                redirect_uri: this.options.redirectUri,
            },
        });

        // Initialize the Auth0 client.
    }

    /**
     * Check if the user is signed in.
     * @returns True if the user is signed in, false otherwise.
     */
    async isSignedIn(): Promise<boolean> {
        try {
            await this.client.checkSession();
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Sign in to the client.
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
     * Request a signature from the client.
     * @param requestSignatureOptions The options for the request signature.
     * @returns The signature.
     */
    async requestSignature(requestSignatureOptions: Auth0RequestSignatureOptions): Promise<void> {
        const { redirectUri, imageUrl, name } = requestSignatureOptions;

        await this.client.loginWithRedirect({
            authorizationParams: {
                imageUrl,
                name,
                redirect_uri: redirectUri ?? this.options.redirectUri,
            },
        });
    }

    /**
     * Get the signature request.
     * @returns The signature request.
     */
    async getSignatureRequest(): Promise<string> {
        return await this.client.getTokenSilently();
    }
}
