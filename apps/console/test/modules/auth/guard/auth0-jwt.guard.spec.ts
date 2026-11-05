import { BusinessException } from "../../../../src/modules/common/exception/business.exception";
import { ErrorCode } from "../../../../src/modules/common/exception/error-codes";
import { Auth0JwtGuard } from "../../../../src/modules/auth/guard/auth0-jwt.guard";
import { AuthErrorCode } from "../../../../src/modules/auth/error/auth.error-codes";
import { Role, SessionUser } from "../../../../src/modules/auth/types/session-user";

describe("Auth0JwtGuard", () => {
    const guard = new Auth0JwtGuard();
    const user: SessionUser = { sub: "auth0|alice", email: "alice@example.com", emailVerified: true, role: Role.USER };

    describe("handleRequest", () => {
        it("should answer the user passport-jwt verified", () => {
            expect(guard.handleRequest(null, user, undefined)).toBe(user);
        });

        it("should rethrow what the strategy's validate threw", () => {
            const error = new BusinessException(AuthErrorCode.EMAIL_REQUIRED);

            expect(() => guard.handleRequest(error, false, undefined)).toThrow(error);
        });

        it("should throw the business error the key provider failed with", () => {
            const outage = new BusinessException(ErrorCode.INTERNAL);

            expect(() => guard.handleRequest(null, false, outage)).toThrow(outage);
        });

        it("should answer a refused token with UNAUTHENTICATED", () => {
            expect(() => guard.handleRequest(null, false, new Error("invalid signature"))).toThrow(
                new BusinessException(AuthErrorCode.UNAUTHENTICATED),
            );
        });
    });
});
