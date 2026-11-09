import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, decodeProtectedHeader, exportSPKI, JWTVerifyGetKey } from "jose";
import { SecretOrKeyProvider } from "passport-jwt";
import { Auth0Config } from "../../config/auth0.config";

export const JWT_KEY_SET = Symbol("JWT_KEY_SET");

/**
 * Finds the public key of a token in the key set.
 * @param keySet The key lookup.
 * @param rawJwtToken The raw token.
 * @returns The public key as PEM, or undefined when the token has none.
 */
async function findKey(keySet: JWTVerifyGetKey, rawJwtToken: string): Promise<string | undefined> {
    try {
        const { alg, kid } = decodeProtectedHeader(rawJwtToken);
        if (alg === undefined) return undefined;
        const [protectedHeader, payload, signature] = rawJwtToken.split(".");
        const key = await keySet({ alg, kid }, { protected: protectedHeader, payload, signature });
        return "type" in key && key.type === "public" ? await exportSPKI(key) : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Adapts a key set to passport-jwt's key provider. A token without a key fails as a 401.
 * @param keySet The key lookup.
 * @returns The passport-jwt key provider.
 */
export function keyProvider(keySet: JWTVerifyGetKey): SecretOrKeyProvider {
    return (_request, rawJwtToken: string, done) => {
        void findKey(keySet, rawJwtToken).then((key) => done(null, key));
    };
}

export const jwtKeySetProvider: Provider = {
    provide: JWT_KEY_SET,
    inject: [ConfigService],
    useFactory: (configService: ConfigService): JWTVerifyGetKey => {
        const { loginDomain } = configService.get<Auth0Config>("auth0")!;
        return createRemoteJWKSet(new URL(`https://${loginDomain}/.well-known/jwks.json`));
    },
};
