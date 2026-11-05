import { Auth0Client, GenericError, PopupOpenError } from "@auth0/auth0-spa-js";
import { ConfigManagerMock } from "@frontend/config/mocks/core/manager";
import { ServiceError } from "@frontend/core/data-access/service/error";
import { Auth0Service } from "../../../../src/data-access/services";
import { Auth0ServiceErrors } from "../../../../src/data-access/console-auth.service.errors";

jest.mock("@auth0/auth0-spa-js", () => ({
    ...jest.requireActual("@auth0/auth0-spa-js"),
    Auth0Client: jest.fn(),
}));

const Auth0ClientMock = jest.mocked(Auth0Client);

const client = {
    checkSession: jest.fn(),
    handleRedirectCallback: jest.fn(),
    isAuthenticated: jest.fn(),
    getUser: jest.fn(),
    loginWithPopup: jest.fn(),
    loginWithRedirect: jest.fn(),
    logout: jest.fn(),
    getIdTokenClaims: jest.fn(),
    getTokenSilently: jest.fn(),
};

describe("Auth0Service", () => {
    const configManagerMock = new ConfigManagerMock();
    configManagerMock.config = { ...configManagerMock.config, auth0Domain: "login.example.com", auth0ClientId: "console-client" };

    const service = new Auth0Service(configManagerMock);

    beforeEach(() => {
        Object.values(client).forEach((method) => method.mockReset());
        Auth0ClientMock.mockReset().mockImplementation(() => client as unknown as Auth0Client);
        window.history.replaceState(null, "", "/");
    });

    describe("onLoad", () => {
        it("should build the client from the config and restore the session", async () => {
            await service.onLoad();

            expect(Auth0ClientMock).toHaveBeenCalledWith({
                domain: "login.example.com",
                clientId: "console-client",
                authorizationParams: { redirect_uri: "http://localhost" },
                cacheLocation: "memory",
                useRefreshTokens: true,
                useRefreshTokensFallback: true,
            });
            expect(client.checkSession).toHaveBeenCalledTimes(1);
            expect(client.handleRedirectCallback).not.toHaveBeenCalled();
        });

        it("should finish a redirect sign-in and go back to where it started", async () => {
            window.history.replaceState(null, "", "/?code=abc&state=xyz");
            client.handleRedirectCallback.mockResolvedValueOnce({ appState: { returnTo: "/admin/dapps?view=all" } });

            await service.onLoad();

            expect(window.location.pathname + window.location.search).toBe("/admin/dapps?view=all");
            expect(client.checkSession).not.toHaveBeenCalled();
        });

        it("should drop the callback parameters when the redirect sign-in failed", async () => {
            window.history.replaceState(null, "", "/?error=access_denied&state=xyz");
            client.handleRedirectCallback.mockRejectedValueOnce(new GenericError("access_denied", "Denied"));

            await service.onLoad();

            expect(window.location.pathname + window.location.search).toBe("/");
        });

        it("should refuse to load without an Auth0 tenant", async () => {
            const unconfigured = new ConfigManagerMock();
            const original = configManagerMock.config;
            configManagerMock.config = unconfigured.config;

            await expect(service.onLoad()).rejects.toEqual(new ServiceError(Auth0ServiceErrors.NOT_CONFIGURED));

            configManagerMock.config = original;
        });
    });

    describe("loginWithPopup", () => {
        beforeEach(() => service.onLoad());

        it("should give the popup ten minutes", async () => {
            await service.loginWithPopup();

            expect(client.loginWithPopup).toHaveBeenCalledWith(undefined, { timeoutInSeconds: 600 });
        });

        it("should report a blocked popup", async () => {
            client.loginWithPopup.mockRejectedValueOnce(new PopupOpenError());

            await expect(service.loginWithPopup()).rejects.toEqual(new ServiceError(Auth0ServiceErrors.POPUP_BLOCKED));
        });
    });

    describe("renewTokens", () => {
        beforeEach(() => service.onLoad());

        it("should renew past the cache", async () => {
            await service.renewTokens();

            expect(client.getTokenSilently).toHaveBeenCalledWith({ cacheMode: "off" });
        });

        it.each(["login_required", "consent_required", "interaction_required", "invalid_grant", "missing_refresh_token"])(
            "should report an ended session on %s",
            async (code) => {
                client.getTokenSilently.mockRejectedValueOnce(new GenericError(code, "Ended"));

                await expect(service.renewTokens()).rejects.toEqual(new ServiceError(Auth0ServiceErrors.SESSION_ENDED));
            },
        );

        it("should pass any other failure through", async () => {
            const timeout = new GenericError("timeout", "Timeout");
            client.getTokenSilently.mockRejectedValueOnce(timeout);

            await expect(service.renewTokens()).rejects.toBe(timeout);
        });
    });

    describe("logout", () => {
        beforeEach(() => service.onLoad());

        it("should come back to the app's origin", async () => {
            await service.logout();

            expect(client.logout).toHaveBeenCalledWith({ logoutParams: { returnTo: "http://localhost" } });
        });
    });

    describe("getEmail", () => {
        beforeEach(() => service.onLoad());

        it("should return the ID token's email", async () => {
            client.getUser.mockResolvedValueOnce({ email: "owner@example.com" });

            await expect(service.getEmail()).resolves.toBe("owner@example.com");
        });
    });
});
