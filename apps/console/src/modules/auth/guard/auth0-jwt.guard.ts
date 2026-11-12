import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JWTPayload, JWTVerifyGetKey } from "jose";
import { jwtVerify } from "jose";
import { Auth0Config } from "../../../config/auth0.config";
import { BusinessException } from "../../common/exception/business.exception";
import { AuthErrorCode } from "../error/auth.error-codes";
import { JWT_KEY_SET } from "../jwt-key-set";
import { AuthenticatedRequest, Role, SessionUser } from "../types/session-user";

@Injectable()
export class Auth0JwtGuard implements CanActivate {
    constructor(
        private readonly configService: ConfigService,
        @Inject(JWT_KEY_SET) private readonly keySet: JWTVerifyGetKey,
    ) {}

    /**
     * Verifies the request's Auth0 ID token and sets its session user. A missing or refused token answers UNAUTHENTICATED.
     * @param context The request context.
     * @returns True once the request has a session user.
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        request.user = this.toSessionUser(await this.verify(request.headers.authorization));
        return true;
    }

    /**
     * Checks a Bearer ID token's signature, expiry, issuer and audience.
     * @param authorization The Authorization header.
     * @returns The verified claims.
     */
    private async verify(authorization: string | undefined): Promise<JWTPayload> {
        if (authorization?.slice(0, 7).toLowerCase() !== "bearer ") throw new BusinessException(AuthErrorCode.UNAUTHENTICATED);
        const { loginDomain, consoleClientId } = this.configService.get<Auth0Config>("auth0")!;
        try {
            const { payload } = await jwtVerify(authorization.slice(7).trim(), this.keySet, {
                issuer: `https://${loginDomain}/`,
                audience: consoleClientId,
                algorithms: ["RS256"],
            });
            return payload;
        } catch {
            throw new BusinessException(AuthErrorCode.UNAUTHENTICATED);
        }
    }

    /**
     * Turns verified claims into the session user. A verified email in ADMIN_EMAILS makes an admin.
     * @param payload The verified claims.
     * @returns The session user.
     */
    private toSessionUser(payload: JWTPayload): SessionUser {
        const { email } = payload;
        if (typeof email !== "string" || email === "") throw new BusinessException(AuthErrorCode.EMAIL_REQUIRED);
        const emailVerified = payload.email_verified === true;
        const adminEmails = this.configService.get<string[]>("admin.emails")!;
        const role = emailVerified && adminEmails.includes(email.toLowerCase()) ? Role.ADMIN : Role.USER;
        return { email, emailVerified, role };
    }
}
