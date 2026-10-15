import type { JWTVerifyGetKey } from "jose";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { loadConfig } from "../../src/config";

const KEY_ID = "console-test-key";
const ALGORITHM = "RS256";
const keyPair = generateKeyPair(ALGORITHM);

export type TokenOptions = {
    sub: string;
    email: string;
    emailVerified?: boolean;
};

export async function testKeySet(): Promise<JWTVerifyGetKey> {
    const jwk = await exportJWK((await keyPair).publicKey);
    return createLocalJWKSet({ keys: [{ ...jwk, kid: KEY_ID, alg: ALGORITHM, use: "sig" }] });
}

export async function signToken(options: TokenOptions): Promise<string> {
    const { auth0 } = loadConfig();
    return new SignJWT({ email: options.email, email_verified: options.emailVerified ?? true })
        .setProtectedHeader({ alg: ALGORITHM, kid: KEY_ID, typ: "JWT" })
        .setSubject(options.sub)
        .setIssuer(`https://${auth0.loginDomain}/`)
        .setAudience(auth0.consoleClientId)
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign((await keyPair).privateKey);
}
