import { Auth0Client, GenericError, IdToken, PopupOpenError } from "@auth0/auth0-spa-js";
import { IConfigManager } from "@frontend/config";
import { Service } from "@frontend/core/data-access/service";
import { ServiceError } from "@frontend/core/data-access/service/error";
import { IAuth0Service } from "../../domain/interfaces";
import { Auth0ServiceErrors } from "../console-auth.service.errors";

/**
 * The SDK gives up on the popup after 60 s by default, too soon for a first sign-up.
 */
const POPUP_TIMEOUT_IN_SECONDS = 600;

const SESSION_ENDED_ERRORS = new Set([
    "login_required",
    "consent_required",
    "interaction_required",
    "invalid_grant",
    "missing_refresh_token",
]);

type AppState = { returnTo?: string };

/**
 * Whether the URL is Auth0 coming back from a redirect sign-in.
 * @param search The URL's query string.
 * @returns `true` when it carries the callback's parameters.
 */
function isRedirectCallback(search: string): boolean {
    const params = new URLSearchParams(search);
    return (params.has("code") || params.has("error")) && params.has("state");
}

@Service()
export class Auth0Service implements IAuth0Service {
    constructor(private readonly configManager: IConfigManager) {}

    private client: Auth0Client | null = null;

    /**
     * Auto-invoked by `ServiceFactory.load()` after the config has loaded. Builds the SDK client, then finishes a redirect
     * sign-in or restores the session.
     * @throws `ServiceError(NOT_CONFIGURED)` when the config has no Auth0 tenant or client.
     */
    async onLoad(): Promise<void> {
        const { auth0Domain, auth0ClientId } = this.configManager.config;
        if (!auth0Domain || !auth0ClientId) throw new ServiceError(Auth0ServiceErrors.NOT_CONFIGURED);

        this.client = new Auth0Client({
            domain: auth0Domain,
            clientId: auth0ClientId,
            authorizationParams: { redirect_uri: window.location.origin },
            cacheLocation: "memory",
            useRefreshTokens: true,
            useRefreshTokensFallback: true,
        });

        if (isRedirectCallback(window.location.search)) {
            let returnTo = "/";
            try {
                const { appState } = await this.client.handleRedirectCallback<AppState>();
                returnTo = appState?.returnTo ?? returnTo;
            } catch {
                // A failed callback leaves the user signed out, on the sign-in screen.
            }
            window.history.replaceState(null, "", returnTo);
        } else {
            await this.client.checkSession();
        }
    }

    /**
     * Returns the SDK client.
     * @throws `ServiceError(NOT_INITIALIZED)` if `onLoad` has not run yet.
     * @returns The Auth0 client.
     */
    private getClient(): Auth0Client {
        if (!this.client) throw new ServiceError(Auth0ServiceErrors.NOT_INITIALIZED);
        return this.client;
    }

    /**
     * @inheritdoc
     */
    isAuthenticated(): Promise<boolean> {
        return this.getClient().isAuthenticated();
    }

    /**
     * @inheritdoc
     */
    async getEmail(): Promise<string | undefined> {
        return (await this.getClient().getUser())?.email;
    }

    /**
     * @inheritdoc
     */
    async loginWithPopup(): Promise<void> {
        try {
            await this.getClient().loginWithPopup(undefined, { timeoutInSeconds: POPUP_TIMEOUT_IN_SECONDS });
        } catch (error) {
            if (error instanceof PopupOpenError) throw new ServiceError(Auth0ServiceErrors.POPUP_BLOCKED);
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    loginWithRedirect(returnTo: string): Promise<void> {
        return this.getClient().loginWithRedirect<AppState>({ appState: { returnTo } });
    }

    /**
     * @inheritdoc
     */
    logout(): Promise<void> {
        return this.getClient().logout({ logoutParams: { returnTo: window.location.origin } });
    }

    /**
     * @inheritdoc
     */
    getIdTokenClaims(): Promise<IdToken | undefined> {
        return this.getClient().getIdTokenClaims();
    }

    /**
     * @inheritdoc
     */
    async renewTokens(): Promise<void> {
        try {
            await this.getClient().getTokenSilently({ cacheMode: "off" });
        } catch (error) {
            if (error instanceof GenericError && SESSION_ENDED_ERRORS.has(error.error))
                throw new ServiceError(Auth0ServiceErrors.SESSION_ENDED);
            throw error;
        }
    }
}
