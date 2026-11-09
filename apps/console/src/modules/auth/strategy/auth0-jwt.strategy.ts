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
        });
    }

    /**
     * Turns the claims of a verified ID token into the session user. A verified email in ADMIN_EMAILS makes an admin.
     * @param payload The verified claims.
     * @returns The session user.
     */
    validate(payload: JWTPayload): SessionUser {
        const { email } = payload;
        if (typeof email !== "string" || email === "") throw new BusinessException(AuthErrorCode.EMAIL_REQUIRED);
        const emailVerified = payload.email_verified === true;
        const adminEmails = this.configService.get<string[]>("admin.emails")!;
        const role = emailVerified && adminEmails.includes(email.toLowerCase()) ? Role.ADMIN : Role.USER;
        return { email, emailVerified, role };
    }
}
