import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { JWTPayload, JWTVerifyGetKey } from "jose";
import { errors, jwtVerify } from "jose";
import type { ConsoleConfig } from "../../../config/console-config";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator";
import { ConsoleException } from "../../common/exception/console.exception";
import { AuthErrorCode } from "../error/auth-error-codes";
import { JWT_KEY_SET } from "../jwt-key-set";
import type { AuthenticatedRequest, SessionUser } from "../session-user";
import { Role } from "../session-user";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject(ConfigService) private readonly configService: ConfigService<ConsoleConfig, true>,
        @Inject(JWT_KEY_SET) private readonly keySet: JWTVerifyGetKey,
    ) {}

    /**
     * Lets public routes through and otherwise attaches the session user from a valid Bearer ID token.
     * @param context The request context.
     * @returns True once the request may proceed.
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;

        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
        if (scheme?.toLowerCase() !== "bearer" || !token) throw new ConsoleException(AuthErrorCode.UNAUTHENTICATED);

        request.user = this.toSessionUser(await this.verify(token));
        return true;
    }

    /**
     * Verifies the ID token against the console's issuer, audience and key set, rethrowing key-set outages as they are.
     * @param token The raw ID token.
     * @returns The verified claims.
     */
    private async verify(token: string): Promise<JWTPayload> {
        const { loginDomain, consoleClientId } = this.configService.get("auth0", { infer: true });
        try {
            const { payload } = await jwtVerify(token, this.keySet, {
                issuer: `https://${loginDomain}/`,
                audience: consoleClientId,
                algorithms: ["RS256"],
                clockTolerance: 60,
                requiredClaims: ["exp"],
            });
            return payload;
        } catch (error) {
            // A key-set fetch timeout, non-200 response or unparsable or malformed key set is an outage, not a bad token.
            if (
                error instanceof errors.JOSEError &&
                !(error instanceof errors.JWKSTimeout || error instanceof errors.JWKSInvalid) &&
                error.code !== "ERR_JOSE_GENERIC"
            ) {
                throw new ConsoleException(AuthErrorCode.UNAUTHENTICATED);
            }
            throw error;
        }
    }

    /**
     * Checks the authorized party and email claim, and makes a verified email in ADMIN_EMAILS an admin.
     * @param payload The verified claims.
     * @returns The session user.
     */
    private toSessionUser(payload: JWTPayload): SessionUser {
        const { sub, email, azp, aud } = payload;
        const consoleClientId = this.configService.get("auth0.consoleClientId", { infer: true });
        const adminEmails = this.configService.get("admin.emails", { infer: true });
        if (!sub) throw new ConsoleException(AuthErrorCode.UNAUTHENTICATED);
        // OIDC Core 3.1.3.7: an authorized party must be the console, and a token for several audiences must name one.
        if (azp === undefined ? Array.isArray(aud) && aud.length > 1 : azp !== consoleClientId) {
            throw new ConsoleException(AuthErrorCode.UNAUTHENTICATED);
        }
        if (typeof email !== "string" || email === "") throw new ConsoleException(AuthErrorCode.EMAIL_REQUIRED);
        const emailVerified = payload.email_verified === true;
        const role = emailVerified && adminEmails.has(email.toLowerCase()) ? Role.ADMIN : Role.USER;
        return { sub, email, emailVerified, role };
    }
}
