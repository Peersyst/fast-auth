import { ServiceError } from "@frontend/core/data-access/service/error";
import { DomainError } from "@frontend/core/domain/error";
import { ConsoleAuthController } from "../../../../src/domain/controllers";
import { ConsoleAuthErrors } from "../../../../src/domain/console-auth.errors";
import { Auth0ServiceErrors } from "../../../../src/data-access/console-auth.service.errors";
import { Auth0ServiceMock } from "../../../mocks/data-access/services";
import { ConsoleAuthApiMock } from "../../../mocks/data-access/api";
import { createApiErrorMock } from "@shared/console/test/mocks/common";

const NOW = Date.parse("2026-11-04T10:00:00Z");

describe("ConsoleAuthController", () => {
    const consoleAuthApiMock = new ConsoleAuthApiMock();
    const auth0ServiceMock = new Auth0ServiceMock();

    const controller = new ConsoleAuthController(consoleAuthApiMock, auth0ServiceMock);

    beforeEach(() => {
        consoleAuthApiMock.clearMocks();
        auth0ServiceMock.clearMocks();
        jest.spyOn(Date, "now").mockReturnValue(NOW);
    });

    afterEach(() => jest.restoreAllMocks());

    describe("getSession", () => {
        it("should return the signed-in user's email", async () => {
            await expect(controller.getSession()).resolves.toEqual({ isAuthenticated: true, email: "owner@example.com" });
        });

        it("should return a signed-out session without reading the user", async () => {
            auth0ServiceMock.isAuthenticated.mockResolvedValueOnce(false);

            await expect(controller.getSession()).resolves.toEqual({ isAuthenticated: false });
            expect(auth0ServiceMock.getEmail).not.toHaveBeenCalled();
        });
    });

    describe("signIn", () => {
        it("should sign in through the popup", async () => {
            await controller.signIn();

            expect(auth0ServiceMock.loginWithPopup).toHaveBeenCalledTimes(1);
        });

        it("should report a blocked popup", async () => {
            auth0ServiceMock.loginWithPopup.mockRejectedValueOnce(new ServiceError(Auth0ServiceErrors.POPUP_BLOCKED));

            await expect(controller.signIn()).rejects.toEqual(new DomainError(ConsoleAuthErrors.POPUP_BLOCKED));
        });

        it("should report any other failure as a sign-in that did not finish", async () => {
            auth0ServiceMock.loginWithPopup.mockRejectedValueOnce(new Error("Popup closed"));

            await expect(controller.signIn()).rejects.toEqual(new DomainError(ConsoleAuthErrors.SIGN_IN_FAILED));
        });
    });

    describe("continueInTab", () => {
        it("should redirect to Auth0 coming back to the path", async () => {
            await controller.continueInTab("/admin/dapps?view=all");

            expect(auth0ServiceMock.loginWithRedirect).toHaveBeenCalledWith("/admin/dapps?view=all");
        });
    });

    describe("signOut", () => {
        it("should sign out of Auth0", async () => {
            await controller.signOut();

            expect(auth0ServiceMock.logout).toHaveBeenCalledTimes(1);
        });
    });

    describe("getIdToken", () => {
        it("should return the cached ID token while it has more than a minute left", async () => {
            auth0ServiceMock.getIdTokenClaims.mockResolvedValueOnce({ __raw: "cached-token", exp: (NOW + 61_000) / 1000 });

            await expect(controller.getIdToken()).resolves.toBe("cached-token");
            expect(auth0ServiceMock.renewTokens).not.toHaveBeenCalled();
        });

        it("should renew an ID token with less than a minute left", async () => {
            auth0ServiceMock.getIdTokenClaims
                .mockResolvedValueOnce({ __raw: "old-token", exp: (NOW + 59_000) / 1000 })
                .mockResolvedValueOnce({ __raw: "new-token", exp: (NOW + 3_600_000) / 1000 });

            await expect(controller.getIdToken()).resolves.toBe("new-token");
            expect(auth0ServiceMock.renewTokens).toHaveBeenCalledTimes(1);
        });

        it("should report an expired session when there is no ID token after renewing", async () => {
            await expect(controller.getIdToken()).rejects.toEqual(new DomainError(ConsoleAuthErrors.SESSION_EXPIRED));
        });

        it("should report an expired session when Auth0 ended it", async () => {
            auth0ServiceMock.renewTokens.mockRejectedValueOnce(new ServiceError(Auth0ServiceErrors.SESSION_ENDED));

            await expect(controller.getIdToken()).rejects.toEqual(new DomainError(ConsoleAuthErrors.SESSION_EXPIRED));
        });

        it("should report a failed renewal when Auth0 could not renew", async () => {
            auth0ServiceMock.renewTokens.mockRejectedValueOnce(new Error("Timeout"));

            await expect(controller.getIdToken()).rejects.toEqual(new DomainError(ConsoleAuthErrors.SESSION_RENEWAL_FAILED));
        });
    });

    describe("refreshSession", () => {
        it("should renew the tokens", async () => {
            await controller.refreshSession();

            expect(auth0ServiceMock.renewTokens).toHaveBeenCalledTimes(1);
        });

        it("should report a failed renewal", async () => {
            auth0ServiceMock.renewTokens.mockRejectedValueOnce(new Error("Timeout"));

            await expect(controller.refreshSession()).rejects.toEqual(new DomainError(ConsoleAuthErrors.SESSION_RENEWAL_FAILED));
        });
    });

    describe("getMe", () => {
        it("should return the user", async () => {
            await expect(controller.getMe()).resolves.toEqual({ email: "owner@example.com", role: "user", emailVerified: true });
        });

        it.each([
            ["a 401 with the console's code", createApiErrorMock(401, "UNAUTHENTICATED"), ConsoleAuthErrors.SESSION_EXPIRED],
            [
                "a 401 with the validator's text",
                createApiErrorMock(401, "Authorization header required"),
                ConsoleAuthErrors.SESSION_EXPIRED,
            ],
            ["a token without an email", createApiErrorMock(403, "EMAIL_REQUIRED"), ConsoleAuthErrors.EMAIL_REQUIRED],
            ["a server error", createApiErrorMock(500, "Internal server error"), ConsoleAuthErrors.SERVER_ERROR],
            ["an API without the route", createApiErrorMock(404, "not found"), ConsoleAuthErrors.SERVER_ERROR],
            ["an API without the method", createApiErrorMock(405, "method not allowed"), ConsoleAuthErrors.SERVER_ERROR],
            ["an unreachable console", new TypeError("Failed to fetch"), ConsoleAuthErrors.CONSOLE_UNREACHABLE],
        ])("should map %s", async (_, error, code) => {
            consoleAuthApiMock.me.mockRejectedValueOnce(error);

            await expect(controller.getMe()).rejects.toEqual(new DomainError(code));
        });

        it("should pass an expired session from the token through", async () => {
            consoleAuthApiMock.me.mockRejectedValueOnce(new DomainError(ConsoleAuthErrors.SESSION_EXPIRED));

            await expect(controller.getMe()).rejects.toEqual(new DomainError(ConsoleAuthErrors.SESSION_EXPIRED));
        });
    });
});
