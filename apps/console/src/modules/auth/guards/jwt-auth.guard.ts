import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { JWTPayload, JWTVerifyGetKey } from "jose";
import { errors, jwtVerify } from "jose";
import type { ConsoleConfig } from "../../../config/console-config";
import { CONSOLE_CONFIG } from "../../../config/console-config";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator";
import { ConsoleException } from "../../common/exception/console.exception";
import { JWT_KEY_SET } from "../jwt-key-set";
import type { AuthenticatedRequest, SessionUser } from "../session-user";
import { Role } from "../session-user";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject(CONSOLE_CONFIG) private readonly config: ConsoleConfig,
        @Inject(JWT_KEY_SET) private readonly keySet: JWTVerifyGetKey,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;

        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
        if (scheme?.toLowerCase() !== "bearer" || !token) throw new ConsoleException("UNAUTHENTICATED");

        request.user = this.toSessionUser(await this.verify(token));
        return true;
    }

    private async verify(token: string): Promise<JWTPayload> {
        const { loginDomain, consoleClientId } = this.config.auth0;
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
                throw new ConsoleException("UNAUTHENTICATED");
            }
            throw error;
        }
    }

    private toSessionUser(payload: JWTPayload): SessionUser {
        const { sub, email, azp, aud } = payload;
        if (!sub) throw new ConsoleException("UNAUTHENTICATED");
        // OIDC Core 3.1.3.7: an authorized party must be the console, and a token for several audiences must name one.
        if (azp === undefined ? Array.isArray(aud) && aud.length > 1 : azp !== this.config.auth0.consoleClientId) {
            throw new ConsoleException("UNAUTHENTICATED");
        }
        if (typeof email !== "string" || email === "") throw new ConsoleException("EMAIL_REQUIRED");
        const emailVerified = payload.email_verified === true;
        const role = emailVerified && this.config.admin.emails.has(email.toLowerCase()) ? Role.Admin : Role.User;
        return { sub, email, emailVerified, role };
    }
}
