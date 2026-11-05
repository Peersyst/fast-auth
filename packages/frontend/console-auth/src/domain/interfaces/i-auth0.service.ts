import { IdToken } from "@auth0/auth0-spa-js";

export interface IAuth0Service {
    /**
     * Whether a user is signed in.
     * @returns `true` when the SDK holds a session.
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Gets the signed-in user's email.
     * @returns The email, or `undefined` when the ID token carries none.
     */
    getEmail(): Promise<string | undefined>;
    /**
     * Signs in through the Auth0 popup.
     * @throws `ServiceError(POPUP_BLOCKED)` when the browser blocks the popup.
     */
    loginWithPopup(): Promise<void>;
    /**
     * Signs in by redirecting this tab to Auth0.
     * @param returnTo The path to come back to after signing in.
     */
    loginWithRedirect(returnTo: string): Promise<void>;
    /**
     * Signs out of Auth0 and comes back to the app's origin.
     */
    logout(): Promise<void>;
    /**
     * Gets the cached ID token claims.
     * @returns The claims, or `undefined` when signed out.
     */
    getIdTokenClaims(): Promise<IdToken | undefined>;
    /**
     * Renews the tokens past the cache.
     * @throws `ServiceError(SESSION_ENDED)` when Auth0 ended the session.
     */
    renewTokens(): Promise<void>;
}
