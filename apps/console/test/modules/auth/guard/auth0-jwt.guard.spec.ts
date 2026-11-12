import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BusinessException } from "../../../../src/modules/common/exception/business.exception";
import { Auth0JwtGuard } from "../../../../src/modules/auth/guard/auth0-jwt.guard";
import { AuthErrorCode } from "../../../../src/modules/auth/error/auth.error-codes";
import { ADMIN_EMAIL, createConfigServiceMock } from "../../../mocks/config/config.mock";
import { signToken, testKeySet, TokenOptions } from "../../../mocks/auth/token.mock";

describe("Auth0JwtGuard", () => {
    let guard: Auth0JwtGuard;

    /**
     * Runs the guard on a request with the given Authorization header.
     * @param authorization The header value.
     * @returns The session user the guard set.
     */
    const signIn = async (authorization: string | undefined): Promise<unknown> => {
        const request: { headers: { authorization?: string }; user?: unknown } = { headers: { authorization } };
        const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
        await guard.canActivate(context);
        return request.user;
    };
    const bearer = async (options: TokenOptions): Promise<string> => `Bearer ${await signToken(options)}`;

    beforeAll(async () => {
        guard = new Auth0JwtGuard(createConfigServiceMock() as unknown as ConfigService, await testKeySet());
    });

    it("should set the session user of a verified token", async () => {
        await expect(signIn(await bearer({ email: "Alice@Example.com" }))).resolves.toEqual({
            email: "Alice@Example.com",
            emailVerified: true,
            role: "user",
        });
    });

    it("should make a verified email in ADMIN_EMAILS an admin, in any case", async () => {
        await expect(signIn(await bearer({ email: ADMIN_EMAIL.toUpperCase() }))).resolves.toEqual({
            email: ADMIN_EMAIL.toUpperCase(),
            emailVerified: true,
            role: "admin",
        });
    });

    it("should keep an admin email whose email is not verified an unverified user", async () => {
        await expect(signIn(await bearer({ email: ADMIN_EMAIL, emailVerified: false }))).resolves.toEqual({
            email: ADMIN_EMAIL,
            emailVerified: false,
            role: "user",
        });
    });

    it("should refuse a token without an email with EMAIL_REQUIRED", async () => {
        await expect(signIn(await bearer({ sub: "auth0|alice" }))).rejects.toEqual(new BusinessException(AuthErrorCode.EMAIL_REQUIRED));
    });

    it.each<[string, () => Promise<string | undefined>]>([
        ["no header", async () => undefined],
        ["a malformed token", async () => "Bearer not.a.jwt"],
        ["another audience", () => bearer({ email: "alice@example.com", audience: "other-client" })],
    ])("should refuse %s with UNAUTHENTICATED", async (_case, authorization) => {
        await expect(signIn(await authorization())).rejects.toEqual(new BusinessException(AuthErrorCode.UNAUTHENTICATED));
    });
});
