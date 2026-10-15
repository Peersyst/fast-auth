import type { Provider } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import type { JSONWebKeySet, JWTVerifyGetKey } from "jose";
import { createLocalJWKSet, createRemoteJWKSet, errors } from "jose";
import type { ConsoleConfig } from "../../config/console-config";
import { CONSOLE_CONFIG } from "../../config/console-config";

export const JWT_KEY_SET = Symbol("JWT_KEY_SET");

const logger = new Logger("JwtKeySet");
const REFETCH_DEADLINE_MS = 6_000;
const REFETCH_COOLDOWN_MS = 30_000;

// jose refetches a key set older than ten minutes and throws when that fetch fails. Verifying with the last key set fetched
// keeps a JWKS outage from refusing every session, and a removed key still stops verifying once a fetch succeeds.
export function remoteKeySet(url: URL): JWTVerifyGetKey {
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
            }, REFETCH_DEADLINE_MS);
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
            if (!superseded) cooldown = { until: Date.now() + REFETCH_COOLDOWN_MS, keySet, error };
            return key;
        } finally {
            clearTimeout(timer);
        }
    };
}

export const jwtKeySetProvider: Provider = {
    provide: JWT_KEY_SET,
    inject: [CONSOLE_CONFIG],
    useFactory: (config: ConsoleConfig): JWTVerifyGetKey =>
        remoteKeySet(new URL(`https://${config.auth0.loginDomain}/.well-known/jwks.json`)),
};
