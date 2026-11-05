import { Logger, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLocalJWKSet, createRemoteJWKSet, decodeProtectedHeader, errors, exportSPKI, JSONWebKeySet, JWTVerifyGetKey } from "jose";
import { SecretOrKeyProvider } from "passport-jwt";
import { BusinessException } from "../common/exception/business.exception";
import { ErrorCode } from "../common/exception/error-codes";
import { Auth0Config } from "../../config/auth0.config";

export const JWT_KEY_SET = Symbol("JWT_KEY_SET");

const logger = new Logger("JwtKeySet");

/**
 * Wraps jose's remote key set so that a failed or stalled refetch verifies with the last key set fetched. jose refetches a key
 * set older than ten minutes and throws when that fetch fails, so this keeps a JWKS outage from refusing every session, and a
 * removed key still stops verifying once a fetch succeeds.
 * @param url The JWKS endpoint.
 * @param timeoutMs How long a fetch may take, both to its headers and to its full body.
 * @param cooldownMs How long after a failed fetch checks use the last key set without fetching.
 * @returns The key lookup for jwtVerify.
 */
export function remoteKeySet(url: URL, timeoutMs: number, cooldownMs: number): JWTVerifyGetKey {
    const fetchRemote = (): ReturnType<typeof createRemoteJWKSet> => createRemoteJWKSet(url, { timeoutDuration: timeoutMs });
    let remote = fetchRemote();
    let lastFetched: JSONWebKeySet | undefined;
    let cooldown: { until: number; keySet: ReturnType<typeof createLocalJWKSet>; error: unknown } | undefined;
    return async (protectedHeader, token) => {
        // A failed fetch leaves jose's cache stale, so for a while after one, checks skip the fetch and use the last key set,
        // rethrowing the outage when it cannot verify.
        if (cooldown !== undefined && Date.now() < cooldown.until) {
            const { error } = cooldown;
            return cooldown.keySet(protectedHeader, token).catch(() => {
                throw error;
            });
        }
        const current = remote;
        let replaced = false;
        let timer: NodeJS.Timeout | undefined;
        // jose stops timing a fetch once its headers arrive, and later checks join a fetch whose body stalled, so past the
        // deadline a fresh key set replaces it.
        const deadline = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                if (remote === current) {
                    remote = fetchRemote();
                    replaced = true;
                }
                reject(new errors.JWKSTimeout());
            }, timeoutMs);
        });
        try {
            return await Promise.race([current(protectedHeader, token), deadline]);
        } catch (error) {
            // A check whose key set another check's deadline already replaced verifies with the newer set once it is fetched,
            // and otherwise answers only its own request from the last set, without a cooldown.
            const superseded = remote !== current && !replaced;
            if (superseded && remote.fresh) return remote(protectedHeader, token);
            const fallback = current.jwks() ?? lastFetched;
            if (fallback === undefined) throw error;
            if (!superseded) lastFetched = fallback;
            const keySet = createLocalJWKSet(fallback);
            // An outage the last key set cannot cover surfaces as a logged 500, not as a 401 that signs the user out.
            const key = await keySet(protectedHeader, token).catch(() => {
                throw error;
            });
            logger.warn(
                `JWKS refetch failed, verified with the last key set fetched: ${error instanceof Error ? error.message : String(error)}`,
            );
            if (!superseded) cooldown = { until: Date.now() + cooldownMs, keySet, error };
            return key;
        } finally {
            clearTimeout(timer);
        }
    };
}

/**
 * Tells a key set outage apart from a token the key set has no key for. An outage is a fetch that timed out or failed, or a
 * key set that cannot be parsed.
 * @param error What the key set threw.
 * @returns Whether the key set is out.
 */
const isOutage = (error: unknown): boolean =>
    !(error instanceof errors.JOSEError) ||
    error instanceof errors.JWKSTimeout ||
    error instanceof errors.JWKSInvalid ||
    error.code === "ERR_JOSE_GENERIC";

/**
 * Finds the public key of a token in the key set. A token whose header cannot be decoded, or that the key set has no key for,
 * gets none. A key set outage is logged and thrown as INTERNAL, so it answers 500 instead of signing the user out.
 * @param keySet The key lookup.
 * @param rawJwtToken The raw token.
 * @returns The public key as PEM, or undefined.
 */
async function findKey(keySet: JWTVerifyGetKey, rawJwtToken: string): Promise<string | undefined> {
    let header: ReturnType<typeof decodeProtectedHeader>;
    try {
        header = decodeProtectedHeader(rawJwtToken);
    } catch {
        return undefined;
    }
    if (header.alg === undefined) return undefined;
    const [protectedHeader, payload, signature] = rawJwtToken.split(".");
    let key: Awaited<ReturnType<JWTVerifyGetKey>>;
    try {
        key = await keySet({ alg: header.alg, kid: header.kid }, { protected: protectedHeader, payload, signature });
    } catch (error) {
        if (!isOutage(error)) return undefined;
        logger.error(`JWKS is unavailable: ${error instanceof Error ? error.message : String(error)}`);
        throw new BusinessException(ErrorCode.INTERNAL);
    }
    return "type" in key && key.type === "public" ? exportSPKI(key) : undefined;
}

/**
 * Adapts a key set to passport-jwt's key provider. A token without a key fails as a 401 and a key set outage errors as a 500.
 * @param keySet The key lookup.
 * @returns The passport-jwt key provider.
 */
export function keyProvider(keySet: JWTVerifyGetKey): SecretOrKeyProvider {
    return (_request, rawJwtToken: string, done) => {
        findKey(keySet, rawJwtToken).then(
            (key) => done(null, key),
            (error: unknown) => done(error),
        );
    };
}

export const jwtKeySetProvider: Provider = {
    provide: JWT_KEY_SET,
    inject: [ConfigService],
    useFactory: (configService: ConfigService): JWTVerifyGetKey => {
        const { loginDomain, jwksTimeoutMs, jwksRefetchCooldownMs } = configService.get<Auth0Config>("auth0")!;
        return remoteKeySet(new URL(`https://${loginDomain}/.well-known/jwks.json`), jwksTimeoutMs, jwksRefetchCooldownMs);
    },
};
