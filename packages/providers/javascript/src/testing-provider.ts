import {
    encodeSignMessage,
    FAST_AUTH_TESTING_TENANTS,
    FastAuthTestingTenantConfig,
    GetSignatureRequestResponse,
    IFastAuthProvider,
    LoginResponse,
    RequestDelegateActionSignatureResponse,
    RequestMessageSignatureResponse,
    RequestTransactionSignatureResponse,
    SignMessageParams,
    User,
} from "@shared/core";
import jwt_decode from "jwt-decode";
import { encodeDelegateAction, encodeTransaction } from "./utils";
import { JavascriptProviderError, JavascriptProviderErrorCodes } from "./errors";
import {
    JavascriptTestingProviderOptions,
    JavascriptTestingRequestDelegateActionSignatureOptions,
    JavascriptTestingRequestTransactionSignatureOptions,
} from "./types";

const PLACEHOLDER = "TO_REPLACE";
const POPUP_FEATURES = "popup,width=400,height=600";
const POPUP_POLL_MS = 500;

type TokenResponse = { id_token: string; access_token?: string };

/**
 * Encode bytes as base64url without padding.
 * @param bytes The bytes to encode.
 * @returns The base64url string.
 */
function base64Url(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
}

/**
 * Read the user ID (sub) of an ID token.
 * @param idToken The ID token.
 * @returns The user ID, or undefined when the token is malformed or carries none.
 */
function subOf(idToken: string): string | undefined {
    try {
        const { sub } = jwt_decode<{ sub?: unknown }>(idToken);
        return typeof sub === "string" && sub !== "" ? sub : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Browser provider for the open testing tenants. The dapp registers nothing. Login goes through the tenant's
 * login page in a popup. That page redeems the authorization code and posts the tokens back, because Auth0 only
 * lets a registered origin read the token response, and a dapp page is not one. Tokens live in memory only, so a
 * page reload logs the user out.
 */
export class JavascriptTestingProvider implements IFastAuthProvider {
    private readonly config: FastAuthTestingTenantConfig;
    private idToken?: string;
    private signingToken?: string;

    /**
     * Create a provider for a testing tenant.
     * @param options The options for the provider.
     * @param options.tenant The testing tenant to use.
     * @throws JavascriptProviderError with TESTING_TENANT_NOT_CONFIGURED when the tenant still holds a placeholder.
     */
    constructor(options: JavascriptTestingProviderOptions) {
        const config = FAST_AUTH_TESTING_TENANTS[options.tenant];
        if (!config || Object.values(config).some((value) => value.includes(PLACEHOLDER))) {
            throw new JavascriptProviderError(JavascriptProviderErrorCodes.TESTING_TENANT_NOT_CONFIGURED);
        }
        this.config = config;
    }

    /**
     * Run the login page in a popup and wait for the tokens it posts back.
     * @param params The authorize params that go to the login page, on top of the origin and state.
     * @returns The token response.
     */
    private authorize(params: Record<string, string>): Promise<TokenResponse> {
        const state = base64Url(globalThis.crypto.getRandomValues(new Uint8Array(16)));
        const url = new URL(this.config.loginUrl);
        for (const [name, value] of Object.entries({ origin: globalThis.location.origin, state, ...params })) {
            url.searchParams.set(name, value);
        }
        // A name per call keeps a concurrent call from navigating this popup.
        const popup = globalThis.open(url.toString(), `fast-auth-login-${state}`, POPUP_FEATURES);
        if (!popup) {
            return Promise.reject(new JavascriptProviderError(JavascriptProviderErrorCodes.POPUP_BLOCKED));
        }
        return this.waitForTokens(popup, state);
    }

    /**
     * Wait for the login page to post the authorization response.
     * @param popup The login popup.
     * @param state The state this flow sent.
     * @returns The token response.
     */
    private waitForTokens(popup: Window, state: string): Promise<TokenResponse> {
        const loginOrigin = new URL(this.config.loginUrl).origin;
        return new Promise((resolve, reject) => {
            const onMessage = (event: MessageEvent) => {
                const { type, response } = event.data ?? {};
                if (
                    event.origin !== loginOrigin ||
                    event.source !== popup ||
                    type !== "authorization_response" ||
                    response?.state !== state
                ) {
                    return;
                }
                done();
                if (typeof response.id_token === "string") {
                    resolve({ id_token: response.id_token, access_token: response.access_token });
                } else {
                    reject(new JavascriptProviderError(JavascriptProviderErrorCodes.AUTHORIZATION_FAILED));
                }
            };
            const timer = setInterval(() => {
                if (popup.closed) {
                    done();
                    reject(new JavascriptProviderError(JavascriptProviderErrorCodes.POPUP_CLOSED));
                }
            }, POPUP_POLL_MS);
            const done = () => {
                globalThis.removeEventListener("message", onMessage);
                clearInterval(timer);
                popup.close();
            };
            globalThis.addEventListener("message", onMessage);
        });
    }

    /**
     * Retrieves the user ID (sub) from the ID token.
     * @returns A promise that resolves to the user ID (sub).
     */
    private async getUserId(): Promise<User> {
        const sub = this.idToken ? subOf(this.idToken) : undefined;
        if (!sub) {
            throw new JavascriptProviderError(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        }
        return { userId: sub };
    }

    /**
     * Check if the user is signed in and the ID token has not expired.
     * @returns True if the user is signed in, false otherwise.
     */
    async isLoggedIn(): Promise<boolean> {
        if (!this.idToken) {
            return false;
        }
        const { exp } = jwt_decode<{ exp?: number }>(this.idToken);
        return exp === undefined || exp * 1000 > Date.now();
    }

    /**
     * Sign in through the tenant's login page. Always asks the user to authenticate again.
     * @returns The authenticated user.
     */
    async login(): Promise<LoginResponse> {
        this.signingToken = undefined;
        const tokens = await this.authorize({ scope: "openid", prompt: "login" });
        if (!subOf(tokens.id_token)) {
            throw new JavascriptProviderError(JavascriptProviderErrorCodes.AUTHORIZATION_FAILED);
        }
        this.idToken = tokens.id_token;
        return this.getUserId();
    }

    /**
     * Forget the tokens held in memory. The Auth0 session stays, but the next login asks to authenticate again.
     */
    async logout(): Promise<void> {
        this.idToken = undefined;
        this.signingToken = undefined;
    }

    /**
     * Get the path for the user.
     * @returns The path for the user.
     */
    async getPath(): Promise<string> {
        const { userId } = await this.getUserId();
        return `jwt#https://${this.config.domain}/#${userId}`;
    }

    /**
     * Open the login page to sign the given payload. The login page reuses the Auth0 session, which can belong to
     * another user than the signed in one.
     * @param param The authorize param that carries the payload.
     * @param bytes The payload to sign.
     * @returns The authenticated user.
     * @throws JavascriptProviderError with SIGNING_USER_MISMATCH when another user approved, keeping the signed in user.
     * @throws JavascriptProviderError with SIGNING_PAYLOAD_MISMATCH when the approval is not for this payload.
     */
    private async requestSignature(param: "transaction" | "delegateAction" | "nep413", bytes: ArrayLike<number>): Promise<User> {
        this.signingToken = undefined;
        const encoded = Array.from(bytes).join(",");
        const tokens = await this.authorize({
            scope: "openid transaction:sign",
            audience: this.config.signingAudience,
            [param]: encoded,
        });
        const sub = subOf(tokens.id_token);
        if (!sub) {
            throw new JavascriptProviderError(JavascriptProviderErrorCodes.AUTHORIZATION_FAILED);
        }
        if (this.idToken && sub !== subOf(this.idToken)) {
            throw new JavascriptProviderError(JavascriptProviderErrorCodes.SIGNING_USER_MISMATCH);
        }
        // The relayer signs whatever `fatxn` holds, so it must be the payload this call asked for.
        let fatxn: unknown;
        try {
            fatxn = tokens.access_token ? jwt_decode<{ fatxn?: unknown }>(tokens.access_token).fatxn : undefined;
        } catch {
            fatxn = undefined;
        }
        if (!Array.isArray(fatxn) || fatxn.join(",") !== encoded) {
            throw new JavascriptProviderError(JavascriptProviderErrorCodes.SIGNING_PAYLOAD_MISMATCH);
        }
        this.idToken = tokens.id_token;
        this.signingToken = tokens.access_token;
        return this.getUserId();
    }

    /**
     * Request a transaction signature from the client.
     * @param options The options for the request.
     * @param options.transaction The transaction to sign.
     * @returns The authenticated user.
     */
    async requestTransactionSignature(
        options: JavascriptTestingRequestTransactionSignatureOptions,
    ): Promise<RequestTransactionSignatureResponse> {
        return this.requestSignature("transaction", encodeTransaction(options.transaction));
    }

    /**
     * Request a delegate action signature from the client.
     * @param options The options for the request.
     * @param options.delegateAction The delegate action to sign.
     * @returns The authenticated user.
     */
    async requestDelegateActionSignature(
        options: JavascriptTestingRequestDelegateActionSignatureOptions,
    ): Promise<RequestDelegateActionSignatureResponse> {
        return this.requestSignature("delegateAction", encodeDelegateAction(options.delegateAction));
    }

    /**
     * Request a NEP-413 message signature from the client.
     * @param options The NEP-413 message parameters.
     * @returns The authenticated user.
     */
    async requestMessageSignature(options: SignMessageParams): Promise<RequestMessageSignatureResponse> {
        return this.requestSignature("nep413", encodeSignMessage(options));
    }

    /**
     * Get the signature request from the last signing approval.
     * @returns The signature request.
     */
    async getSignatureRequest(): Promise<GetSignatureRequestResponse> {
        if (!this.signingToken) {
            throw new JavascriptProviderError(JavascriptProviderErrorCodes.SIGNATURE_REQUEST_NOT_FOUND);
        }
        const decoded = jwt_decode<{ fatxn: Uint8Array }>(this.signingToken);
        const signatureRequest = {
            guardId: `jwt#https://${this.config.domain}/`,
            verifyPayload: this.signingToken,
            signPayload: decoded["fatxn"] as Uint8Array,
        };
        const user = await this.getUserId();
        return { user, signatureRequest };
    }
}
