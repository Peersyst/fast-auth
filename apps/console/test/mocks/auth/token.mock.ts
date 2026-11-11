import { createLocalJWKSet, exportJWK, generateKeyPair, JWTVerifyGetKey, KeyLike, SignJWT } from "jose";
import { ADMIN_EMAIL, testConfig } from "../config/config.mock";

const KEY_ID = "console-test-key";
const ALGORITHM = "RS256";
const keyPair = generateKeyPair(ALGORITHM);

export type TokenOptions = {
    sub?: string;
    email?: string;
    emailVerified?: boolean;
    issuer?: string;
    audience?: string;
    /** The expiry, as jose's setExpirationTime takes it. */
    expiresAt?: number | string;
    alg?: "RS256" | "HS256";
    key?: KeyLike;
};

/**
 * Builds a local key set holding the public half of the key signToken signs with.
 * @returns The key lookup to override JWT_KEY_SET with.
 */
export async function testKeySet(): Promise<JWTVerifyGetKey> {
    const jwk = await exportJWK((await keyPair).publicKey);
    return createLocalJWKSet({ keys: [{ ...jwk, kid: KEY_ID, alg: ALGORITHM, use: "sig" }] });
}

/**
 * Signs an ID token the test config accepts, unless the options change it.
 * @param options The claims and what to change from a valid token. The email is verified unless emailVerified is false.
 * @returns The signed token.
 */
export async function signToken(options: TokenOptions): Promise<string> {
    const { auth0 } = testConfig();
    const { sub, email, emailVerified = true, alg = ALGORITHM, expiresAt = "1h" } = options;
    const jwt = new SignJWT({ ...(email !== undefined && { email }), email_verified: emailVerified })
        .setProtectedHeader({ alg, kid: KEY_ID, typ: "JWT" })
        .setIssuer(options.issuer ?? `https://${auth0.loginDomain}/`)
        .setAudience(options.audience ?? auth0.consoleClientId)
        .setIssuedAt()
        .setExpirationTime(expiresAt);
    if (sub !== undefined) jwt.setSubject(sub);
    if (alg === "HS256") return jwt.sign(new TextEncoder().encode("a-shared-secret-of-enough-length!"));
    return jwt.sign(options.key ?? (await keyPair).privateKey);
}

/**
 * Builds the Authorization header of a user, an admin for ADMIN_EMAIL.
 * @param email The user's email.
 * @param emailVerified Whether the email is verified.
 * @returns The header value.
 */
export async function bearer(email: string, emailVerified = true): Promise<string> {
    return `Bearer ${await signToken({ sub: `auth0|${email.toLowerCase()}`, email, emailVerified })}`;
}

/**
 * Builds the Authorization header of the admin.
 * @returns The header value.
 */
export function adminBearer(): Promise<string> {
    return bearer(ADMIN_EMAIL);
}
