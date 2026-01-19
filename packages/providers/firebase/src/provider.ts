import { decodeJwt } from "jose";
import { SignatureRequest } from "./core/signer/types";
import { FirebaseProviderError, FirebaseProviderErrorCodes } from "./errors";
import { IFastAuthProvider } from "./core/provider/types";
import {
    FirebaseProviderOptions,
    FirebaseProviderType,
    FirebaseRequestDelegateActionSignatureOptions,
    FirebaseRequestTransactionSignatureOptions,
} from "./types";
import { type Auth, AuthProvider, getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { FirebaseApp, initializeApp } from "firebase/app";
import { Store } from "./store/store";
import { BrowserStore } from "./store/browser-store";
import { encodeTransaction, encodeDelegateAction } from "./utils";

export class FirebaseProvider implements IFastAuthProvider {
    private readonly options: FirebaseProviderOptions;
    private app: FirebaseApp;
    private auth: Auth;
    private currentUser: User | null = null;
    private googleProvider: GoogleAuthProvider;
    private appleProvider: OAuthProvider;
    private store: Store;

    constructor(options: FirebaseProviderOptions) {
        this.options = options;
        this.app = initializeApp(options);
        this.auth = getAuth(this.app);
        this.googleProvider = new GoogleAuthProvider();
        this.appleProvider = new OAuthProvider("apple.com");
        this.appleProvider.addScope("email");
        this.appleProvider.addScope("name");
        this.store = options.store ?? new BrowserStore();

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
     * @param providerType The provider type.
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
        this.store.clear();
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
     * @param opts The options for the request signature.
     * @returns The signature.
     */
    async requestTransactionSignature(opts: FirebaseRequestTransactionSignatureOptions): Promise<void> {
        const signPayload = encodeTransaction(opts.transaction);
        const response = await fetch(`${this.options.customJwtIssuerUrl}`, {
            method: "POST",
            body: JSON.stringify({
                jwt: await this.currentUser?.getIdToken(),
                signPayload: signPayload,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            throw new FirebaseProviderError(FirebaseProviderErrorCodes.REQUEST_TRANSACTION_SIGNATURE_FAILED);
        }
        const { token } = await response.json();

        this.store.setSignatureRequest({
            guardId: `jwt#${this.options.issuerUrl}`,
            verifyPayload: token,
            signPayload: Uint8Array.from(signPayload),
        });
    }

    /**
     * Request a delegate action signature from the client.
     * @param opts The options for the request delegate action signature.
     * @returns The void.
     */
    async requestDelegateActionSignature(opts: FirebaseRequestDelegateActionSignatureOptions): Promise<void> {
        const signPayload = encodeDelegateAction(opts.delegateAction);
        const response = await fetch(`${this.options.customJwtIssuerUrl}`, {
            method: "POST",
            body: JSON.stringify({
                jwt: await this.currentUser?.getIdToken(),
                signPayload: signPayload,
            }),
        });
        if (!response.ok) {
            throw new FirebaseProviderError(FirebaseProviderErrorCodes.REQUEST_DELEGATE_TRANSACTION_SIGNATURE_FAILED);
        }
        const { token } = await response.json();

        this.store.setSignatureRequest({
            guardId: `jwt#${this.options.issuerUrl}`,
            verifyPayload: token,
            signPayload: Uint8Array.from(signPayload),
        });
    }

    /**
     * Get the signature request.
     * @returns The signature request.
     */
    async getSignatureRequest(): Promise<SignatureRequest> {
        const request = this.store.getSignatureRequest();
        if (!request) {
            throw new FirebaseProviderError(FirebaseProviderErrorCodes.SIGNATURE_REQUEST_NOT_FOUND);
        }
        this.store.clear();

        return request;
    }
}
