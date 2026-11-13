import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, JWTVerifyGetKey } from "jose";
import { Auth0Config } from "../../config/auth0.config";

export const JWT_KEY_SET = Symbol("JWT_KEY_SET");

export const jwtKeySetProvider: Provider = {
    provide: JWT_KEY_SET,
    inject: [ConfigService],
    useFactory: (configService: ConfigService): JWTVerifyGetKey => {
        const { loginDomain } = configService.get<Auth0Config>("auth0")!;
        return createRemoteJWKSet(new URL(`https://${loginDomain}/.well-known/jwks.json`));
    },
};
