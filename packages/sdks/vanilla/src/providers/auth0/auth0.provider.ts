import { Auth0Client } from "@auth0/auth0-spa-js";
import { Auth0ProviderOptions, Auth0RequestTransactionSignatureOptions } from "./auth0.types";
import { encodeTransaction } from "./utils";
import { decodeJwt } from "jose";
import { SignatureRequest } from "../../signers";

export class Auth0Provider {
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
        } catch (error) {
            console.error("Error checking if user is logged in:", error);
            return false;
        }
    }

    /**
     * Sign in to the client.
     * @param redirectUri The redirect URI to use.
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
        console.log("token", token);
        const { sub } = decodeJwt(token);
        if (!sub) {
            throw new Error("User is not logged in");
        }
        return `jwt/${this.options.domain}/${sub}`;
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
     * Get the signature request.
     * @returns The signature request.
     */
    async getSignatureRequest(): Promise<SignatureRequest> {
        const token = await this.client.getTokenSilently();
        const decoded = decodeJwt(token);
        console.log(decoded);
        return {
            guardId: "",
            verifyPayload: token,
            signPayload: decoded["fatxn"] as string,
        };
    }
}
