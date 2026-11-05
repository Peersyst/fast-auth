import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { BusinessException } from "../../common/exception/business.exception";
import { AuthErrorCode } from "../error/auth.error-codes";
import { SessionUser } from "../types/session-user";

@Injectable()
export class Auth0JwtGuard extends AuthGuard("auth0") {
    /**
     * Answers a refused token with UNAUTHENTICATED, and passes on the business errors of the claim checks and key set outages.
     * @param err What the strategy's validate threw.
     * @param user The session user, or false when passport-jwt refused the token.
     * @param info Why passport-jwt refused the token, a business error when the key set is out.
     * @returns The session user.
     */
    handleRequest<TUser = SessionUser>(err: unknown, user: TUser | false, info: unknown): TUser {
        if (err) throw err;
        if (info instanceof BusinessException) throw info;
        if (!user) throw new BusinessException(AuthErrorCode.UNAUTHENTICATED);
        return user;
    }
}
