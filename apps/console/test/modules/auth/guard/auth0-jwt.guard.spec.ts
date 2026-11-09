import { BusinessException } from "../../../../src/modules/common/exception/business.exception";
import { Auth0JwtGuard } from "../../../../src/modules/auth/guard/auth0-jwt.guard";
import { AuthErrorCode } from "../../../../src/modules/auth/error/auth.error-codes";
import { Role, SessionUser } from "../../../../src/modules/auth/types/session-user";

describe("Auth0JwtGuard", () => {
    const guard = new Auth0JwtGuard();
    const user: SessionUser = { email: "alice@example.com", emailVerified: true, role: Role.USER };

    describe("handleRequest", () => {
        it("should answer the user passport-jwt verified", () => {
            expect(guard.handleRequest(null, user)).toBe(user);
        });

        it("should rethrow what the strategy's validate threw", () => {
            const error = new BusinessException(AuthErrorCode.EMAIL_REQUIRED);

            expect(() => guard.handleRequest(error, false)).toThrow(error);
        });

        it("should answer a refused token with UNAUTHENTICATED", () => {
            expect(() => guard.handleRequest(null, false)).toThrow(new BusinessException(AuthErrorCode.UNAUTHENTICATED));
        });
    });
});
