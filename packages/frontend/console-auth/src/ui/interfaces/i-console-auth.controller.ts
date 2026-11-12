import { MeDto } from "@shared/console";
import { Session } from "../../common";

export interface IConsoleAuthController {
    /**
     * Gets whether a user is signed in, and their email.
     * @returns The session.
     */
    getSession(): Promise<Session>;
    /**
     * Signs in through the Auth0 popup.
     * @throws `DomainError(POPUP_BLOCKED)` when the browser blocks the popup, `DomainError(SIGN_IN_FAILED)` otherwise.
     */
    signIn(): Promise<void>;
    /**
     * Signs in by redirecting this tab to Auth0.
     * @param returnTo The path to come back to after signing in.
     */
    continueInTab(returnTo: string): Promise<void>;
    /**
     * Signs out of Auth0, leaving the app.
     */
    signOut(): Promise<void>;
    /**
     * Gets the ID token the console API takes as Bearer, renewed when it has less than a minute left.
     * @throws `DomainError(SESSION_EXPIRED)` when there is no session to renew.
     * @returns The raw ID token.
     */
    getIdToken(): Promise<string>;
    /**
     * Renews the session past the cache, so the ID token carries the user's latest email verification.
     */
    refreshSession(): Promise<void>;
    /**
     * Gets the signed-in user as the console sees them.
     * @throws `DomainError(SESSION_EXPIRED)` on a 401, `DomainError(EMAIL_REQUIRED)` when the token has no email.
     * @returns The user's email, role and email verification.
     */
    getMe(): Promise<MeDto>;
}
