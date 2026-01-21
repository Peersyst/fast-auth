import { Connection } from "near-api-js";
import { FastAuthSigner } from "../signers/signer";
import { IFastAuthProvider } from "./providers/fast-auth.provider";
import { FastAuthClientError } from "./client.errors";
import { FastAuthClientErrorCodes } from "./client.error-codes";
import { FastAuthClientOptions } from "./client.types";

export class FastAuthClient<P extends IFastAuthProvider = IFastAuthProvider> {
    private provider: P;

    constructor(
        provider: P,
        private readonly connection: Connection,
        private readonly options: FastAuthClientOptions,
    ) {
        this.provider = provider;
    }

    /**
     * Sign in to the client.
     * @param args The arguments for the login.
     * @returns The signature request.
     */
    login(...args: Parameters<P["login"]>) {
        // Call the fast auth provider to sign in.
        return this.provider.login(...args);
    }

    /**
     * Log out of the client.
     * @param args The arguments for the logout.
     * @returns The signature request.
     */
    logout(...args: Parameters<P["logout"]>) {
        return this.provider.logout(args);
    }

    /**
     * Get a signer.
     * @returns The signer.
     */
    async getSigner(): Promise<FastAuthSigner<P>> {
        const isLoggedIn = await this.provider.isLoggedIn();
        if (!isLoggedIn) {
            throw new FastAuthClientError(FastAuthClientErrorCodes.USER_NOT_LOGGED_IN);
        }
        const signer = new FastAuthSigner<P>(this.provider, this.connection, this.options);
        await signer.init();
        return signer;
    }
}
