import { decodeJwt } from "jose";
import { SignatureRequest } from "./core/signer/types";
import { FirebaseProviderError, FirebaseProviderErrorCodes } from "./errors";
import { IFastAuthProvider } from "./core/provider/types";
import {
    FirebaseProviderOptions, FirebaseRequestDelegateActionSignatureOptions,
    FirebaseRequestTransactionSignatureOptions,
    FirebaseProviderType
} from "./types";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    type Auth,
    type User,
    AuthProvider,
} from "firebase/auth";
import { FirebaseApp, initializeApp } from "firebase/app";

export class FirebaseProvider implements IFastAuthProvider {
    private readonly options: FirebaseProviderOptions;
    private app: FirebaseApp;
    private auth: Auth;
    private currentUser: User | null = null;
    private googleProvider: GoogleAuthProvider;
    private appleProvider: OAuthProvider;

    constructor(options: FirebaseProviderOptions) {
        this.options = options;
        this.app = initializeApp(options);
        this.auth = getAuth(this.app);
        this.googleProvider = new GoogleAuthProvider();
        this.appleProvider = new OAuthProvider("apple.com");
        this.appleProvider.addScope("email");
        this.appleProvider.addScope("name");

        // Set up auth state listener
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
        });
    }

    /**
     * Check if the user is signed in.
     * @returns True if the user is signed in, false otherwise.
     */
    async isLoggedIn(): Promise<boolean> {
        return this.currentUser !== null;
    }

    /**
     * Sign in to the client using Google.
     * @returns The void.
     */
    async login(providerType: FirebaseProviderType): Promise<void> {
        if (!this.auth) {
            throw new FirebaseProviderError(FirebaseProviderErrorCodes.FIREBASE_NOT_INITIALIZED);
        }
        let provider: AuthProvider;
        switch (providerType) {
            case "google":
                provider = this.googleProvider;
                break;
            case "apple":
                provider = this.appleProvider;
                break;
            default:
                throw new FirebaseProviderError(FirebaseProviderErrorCodes.INVALID_PROVIDER);
        }
        const result = await signInWithPopup(this.auth, provider);
        this.currentUser = result.user;
    }

    /**
     * Log out of the client.
     */
    async logout(): Promise<void> {
        if (!this.auth) {
            throw new FirebaseProviderError(FirebaseProviderErrorCodes.FIREBASE_NOT_INITIALIZED);
        }
        await this.auth.signOut();
        this.currentUser = null;
    }

    /**
     * Get the path for the user.
     * @returns The path for the user.
     */
    async getPath(): Promise<string> {
        if (!this.currentUser) {
            throw new FirebaseProviderError(FirebaseProviderErrorCodes.USER_NOT_LOGGED_IN);
        }
        const token = await this.currentUser.getIdToken();
        const { sub } = decodeJwt(token);
        if (!sub) {
            throw new FirebaseProviderError(FirebaseProviderErrorCodes.USER_NOT_LOGGED_IN);
        }
        return `jwt#${this.options.issuerUrl}#${sub}`;
    }

    /**
     * Request a signature from the client.
     * @param _ The options for the request signature.
     * @returns The signature.
     */
    async requestTransactionSignature(_: FirebaseRequestTransactionSignatureOptions): Promise<void> {
        // TODO: This would request a jwt for the custom issuer backend, claim the token hash, store the custom jwt
        throw new Error("Method not implemented.");
    }

    /**
     * Request a delegate action signature from the client.
     * @param _ The options for the request delegate action signature.
     * @returns The void.
     */
    async requestDelegateActionSignature(_: FirebaseRequestDelegateActionSignatureOptions): Promise<void> {
        // TODO: This would request a jwt for the custom issuer backend, claim the token hash, store the custom jwt
        throw new Error("Method not implemented.");
    }

    /**
     * Get the signature request.
     * @returns The signature request.
     */
    async getSignatureRequest(): Promise<SignatureRequest> {
        // TODO: This would recover the custom jwt, and prepare the signature request
        throw new Error("Method not implemented.");
    }
}
