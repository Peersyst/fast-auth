import type { Provider } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JSONWebKeySet, JWTVerifyGetKey } from "jose";
import { createLocalJWKSet, createRemoteJWKSet, errors } from "jose";
import type { ConsoleConfig } from "../../config/console-config";

export const JWT_KEY_SET = Symbol("JWT_KEY_SET");

const logger = new Logger("JwtKeySet");

/**
 * Wraps jose's remote key set so that a failed or stalled refetch verifies with the last key set fetched. jose refetches a key
 * set older than ten minutes and throws when that fetch fails, so this keeps a JWKS outage from refusing every session, and a
 * removed key still stops verifying once a fetch succeeds.
 * @param url The JWKS endpoint.
 * @param timeoutMs How long a fetch may take before a fresh key set replaces it.
 * @param cooldownMs How long after a failed fetch checks use the last key set without fetching.
 * @returns The key lookup for jwtVerify.
 */
export function remoteKeySet(url: URL, timeoutMs: number, cooldownMs: number): JWTVerifyGetKey {
    let remote = createRemoteJWKSet(url);
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
                    remote = createRemoteJWKSet(url);
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

export const jwtKeySetProvider: Provider = {
    provide: JWT_KEY_SET,
    inject: [ConfigService],
    useFactory: (configService: ConfigService<ConsoleConfig, true>): JWTVerifyGetKey => {
        const { loginDomain, jwksTimeoutMs, jwksRefetchCooldownMs } = configService.get("auth0", { infer: true });
        return remoteKeySet(new URL(`https://${loginDomain}/.well-known/jwks.json`), jwksTimeoutMs, jwksRefetchCooldownMs);
    },
};
