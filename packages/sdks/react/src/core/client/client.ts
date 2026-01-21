import { Connection } from "near-api-js";
import { FastAuthSigner } from "../signers/signer";
import { IFastAuthProvider } from "./providers/fast-auth.provider";
import { FastAuthClientError } from "./client.errors";
import { FastAuthClientErrorCodes } from "./client.error-codes";
import { FastAuthClientNetwork, FastAuthContracts } from "./client.types";
import { getContractsFromNetwork } from "../../providers/utils/contracts";

export class FastAuthClient<P extends IFastAuthProvider = IFastAuthProvider> {
    private provider: P;
    private readonly options: FastAuthContracts;
    private readonly relayerURL: string;

    constructor(
        provider: P,
        private readonly connection: Connection,
        network: FastAuthClientNetwork,
        relayerURL: string,
    ) {
        this.options = getContractsFromNetwork(network);
        this.provider = provider;
        this.relayerURL = relayerURL;
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
    logout(...args: Parameters<P["logout"]>[]) {
        return this.provider.logout(args);
    }

    /**
     * Check if the user is logged in.
     * @returns Promise<boolean> indicating if the user is logged in.
     */
    async isLoggedIn(): Promise<boolean> {
        return this.provider.isLoggedIn();
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
        const signer = new FastAuthSigner<P>(this.provider, this.connection, this.options, this.relayerURL);
        await signer.init();
        return signer;
    }
}
