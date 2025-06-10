import { FastAuthSigner } from "../signers/signer";
import { IFastAuthProvider } from "./providers/fast-auth.provider";

export class FastAuthClient {
    private provider: IFastAuthProvider;

    constructor(provider: IFastAuthProvider) {
        this.provider = provider;
    }

    /**
     * Sign in to the client.
     * @param opts The options for the login.
     * @returns The signature request.
     */
    login(opts?: any) {
        // Call the fast auth provider to sign in.
        return this.provider.login(opts);
    }

    /**
     * Log out of the client.
     */
    logout() {
        return this.provider.logout();
    }

    /**
     * Get a signer.
     * @param path The path to the signer.
     * @returns The signer.
     */
    async getSigner(): Promise<FastAuthSigner> {
        const isLoggedIn = await this.provider.isLoggedIn();
        if (!isLoggedIn) {
            throw new Error("User is not logged in");
        }
        const signer = new FastAuthSigner(this.provider);
        await signer.init();
        return signer;
    }
}
