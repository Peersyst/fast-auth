import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { JWTPayload, JWTVerifyGetKey } from "jose";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Auth0Config } from "../../../config/auth0.config";
import { BusinessException } from "../../common/exception/business.exception";
import { AuthErrorCode } from "../error/auth.error-codes";
import { JWT_KEY_SET, keyProvider } from "../jwt-key-set";
import { Role, SessionUser } from "../types/session-user";

@Injectable()
export class Auth0JwtStrategy extends PassportStrategy(Strategy, "auth0") {
    constructor(
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(JWT_KEY_SET) keySet: JWTVerifyGetKey,
    ) {
        const { loginDomain, consoleClientId } = configService.get<Auth0Config>("auth0")!;
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKeyProvider: keyProvider(keySet),
            issuer: `https://${loginDomain}/`,
            audience: consoleClientId,
            algorithms: ["RS256"],
            jsonWebTokenOptions: { clockTolerance: 60 },
        });
    }

    /**
     * Turns the claims of a verified ID token into the session user. jsonwebtoken checks `exp` only when present, so a token
     * must carry it here. The authorized party, when named, must be the console, and a token for several audiences must name
     * one (OIDC Core 3.1.3.7). A verified email in ADMIN_EMAILS makes an admin.
     * @param payload The verified claims.
     * @returns The session user.
     */
    validate(payload: JWTPayload): SessionUser {
        const { sub, exp, azp, aud, email } = payload;
        if (typeof sub !== "string" || sub === "") throw new BusinessException(AuthErrorCode.UNAUTHENTICATED);
        if (typeof exp !== "number") throw new BusinessException(AuthErrorCode.UNAUTHENTICATED);
        const consoleClientId = this.configService.get<string>("auth0.consoleClientId");
        if (azp === undefined ? Array.isArray(aud) && aud.length > 1 : azp !== consoleClientId) {
            throw new BusinessException(AuthErrorCode.UNAUTHENTICATED);
        }
        if (typeof email !== "string" || email === "") throw new BusinessException(AuthErrorCode.EMAIL_REQUIRED);
        const emailVerified = payload.email_verified === true;
        const adminEmails = this.configService.get<string[]>("admin.emails")!;
        const role = emailVerified && adminEmails.includes(email.toLowerCase()) ? Role.ADMIN : Role.USER;
        return { sub, email, emailVerified, role };
    }
}
