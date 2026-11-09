import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { BusinessException } from "../../common/exception/business.exception";
import { AuthErrorCode } from "../error/auth.error-codes";
import { SessionUser } from "../types/session-user";

@Injectable()
export class Auth0JwtGuard extends AuthGuard("auth0") {
    /**
     * Answers a refused token with UNAUTHENTICATED, and passes on the business errors of the claim checks.
     * @param err What the strategy's validate threw.
     * @param user The session user, or false when passport-jwt refused the token.
     * @returns The session user.
     */
    handleRequest<TUser = SessionUser>(err: unknown, user: TUser | false): TUser {
        if (err) throw err;
        if (!user) throw new BusinessException(AuthErrorCode.UNAUTHENTICATED);
        return user;
    }
}
