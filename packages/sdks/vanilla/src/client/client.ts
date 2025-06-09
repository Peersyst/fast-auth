import { FastAuthSigner } from "../signers/signer";
import { SignatureRequest } from "../signers/signer.types";
import { IFastAuthProvider } from "./providers/fast-auth.provider";
import { INearApiProvider } from "./providers/near-api.provider";

export class FastAuthClient<O = any> {
    private provider: IFastAuthProvider<O>;
    private nearApiProvider: INearApiProvider;

    constructor(provider: IFastAuthProvider<O>, nearApiProvider: INearApiProvider) {
        this.provider = provider;
        this.nearApiProvider = nearApiProvider;
    }

    /**
     * Sign in to the client.
     * @param opts The options for the login.
     * @returns The signature request.
     */
    login(opts?: O) {
        // Call the fast auth provider to sign in.
        return this.provider.login(opts);
    }

    /**
     * Get a signer.
     * @param path The path to the signer.
     * @returns The signer.
     */
    getSigner(path: string): FastAuthSigner<O, SignatureRequest> {
        return new FastAuthSigner(this.nearApiProvider, this.provider, path);
    }
}
