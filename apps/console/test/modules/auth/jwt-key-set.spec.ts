import { Logger } from "@nestjs/common";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { createLocalJWKSet, errors, exportJWK, exportSPKI, generateKeyPair, JWK, jwtVerify, JWTVerifyGetKey, KeyLike, SignJWT } from "jose";
import { keyProvider, remoteKeySet } from "../../../src/modules/auth/jwt-key-set";
import { BusinessException } from "../../../src/modules/common/exception/business.exception";

const TEN_MINUTES_MS = 10 * 60 * 1000;

describe("remoteKeySet", () => {
    let server: Server;
    let key: JWK;
    let privateKey: KeyLike;
    let healthy: boolean;
    let fetches: number;
    let url: URL;

    beforeAll(async () => {
        const pair = await generateKeyPair("RS256");
        privateKey = pair.privateKey;
        key = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" };
        server = createServer((_request, response) => {
            fetches += 1;
            if (healthy) response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ keys: [key] }));
            else response.writeHead(503).end();
        });
        await new Promise<void>((resolve) => server.listen(0, resolve));
        url = new URL(`http://localhost:${(server.address() as AddressInfo).port}/.well-known/jwks.json`);
    });

    afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

    beforeEach(() => {
        healthy = true;
        fetches = 0;
        jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * Signs a token with the served key under the given key id.
     * @param kid The key id.
     * @returns The token.
     */
    const token = (kid: string): Promise<string> =>
        new SignJWT({}).setProtectedHeader({ alg: "RS256", kid }).setExpirationTime("1h").sign(privateKey);

    /**
     * Moves the clock forward from now.
     * @param ms How far to move it.
     */
    const ageBy = (ms: number): void => {
        const now = Date.now();
        jest.spyOn(Date, "now").mockReturnValue(now + ms);
    };

    it("should verify with the fetched key set", async () => {
        const keySet = remoteKeySet(url, 6_000, 30_000);

        await expect(jwtVerify(await token("k1"), keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        expect(fetches).toBe(1);
    });

    it("should keep verifying with the last key set fetched when the refetch of a stale set fails, and warn", async () => {
        const keySet = remoteKeySet(url, 6_000, 30_000);
        await jwtVerify(await token("k1"), keySet);
        healthy = false;
        ageBy(TEN_MINUTES_MS + 1);

        await expect(jwtVerify(await token("k1"), keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        expect(fetches).toBe(2);
        expect(Logger.prototype.warn).toHaveBeenCalledWith(
            expect.stringContaining("JWKS refetch failed, verified with the last key set fetched"),
        );
    });

    it("should skip refetching for the cooldown after a failed refetch, then refetch", async () => {
        const keySet = remoteKeySet(url, 6_000, 30_000);
        await jwtVerify(await token("k1"), keySet);
        healthy = false;
        ageBy(TEN_MINUTES_MS + 1);
        await jwtVerify(await token("k1"), keySet);

        ageBy(30_000 - 1);
        await jwtVerify(await token("k1"), keySet);
        expect(fetches).toBe(2);

        ageBy(1);
        await jwtVerify(await token("k1"), keySet);
        expect(fetches).toBe(3);
    });

    it("should rethrow the outage when no key set was ever fetched", async () => {
        healthy = false;

        await expect(jwtVerify(await token("k1"), remoteKeySet(url, 6_000, 30_000))).rejects.toThrow("Expected 200 OK");
    });

    it("should rethrow the outage when the last key set lacks the token's key", async () => {
        const keySet = remoteKeySet(url, 6_000, 30_000);
        await jwtVerify(await token("k1"), keySet);
        healthy = false;
        ageBy(TEN_MINUTES_MS + 1);

        await expect(jwtVerify(await token("k2"), keySet)).rejects.toThrow("Expected 200 OK");
    });
});

describe("keyProvider", () => {
    let privateKey: KeyLike;
    let publicPem: string;
    let keySet: JWTVerifyGetKey;

    beforeAll(async () => {
        const pair = await generateKeyPair("RS256");
        privateKey = pair.privateKey;
        publicPem = await exportSPKI(pair.publicKey);
        keySet = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" }] });
    });

    beforeEach(() => {
        jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * Asks the provider for a token's key, as passport-jwt does.
     * @param provider The key provider.
     * @param rawJwtToken The raw token.
     * @returns What the provider called done with.
     */
    const lookUp = (provider: ReturnType<typeof keyProvider>, rawJwtToken: string): Promise<{ error: unknown; key: unknown }> =>
        new Promise((resolve) => provider({}, rawJwtToken, (error, key) => resolve({ error, key })));

    const token = (kid: string): Promise<string> =>
        new SignJWT({}).setProtectedHeader({ alg: "RS256", kid }).setExpirationTime("1h").sign(privateKey);

    it("should answer the token's public key as PEM", async () => {
        await expect(lookUp(keyProvider(keySet), await token("k1"))).resolves.toEqual({ error: null, key: publicPem });
    });

    it("should answer no key for a token whose header cannot be decoded", async () => {
        await expect(lookUp(keyProvider(keySet), "not.a.jwt")).resolves.toEqual({ error: null, key: undefined });
    });

    it("should answer no key for a token the key set has no key for", async () => {
        await expect(lookUp(keyProvider(keySet), await token("k2"))).resolves.toEqual({ error: null, key: undefined });
    });

    it.each<[string, unknown]>([
        ["a fetch timeout", new errors.JWKSTimeout()],
        ["an invalid key set", new errors.JWKSInvalid()],
        ["a non-200 answer", new errors.JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response")],
        ["a network error", new TypeError("fetch failed")],
    ])("should fail with INTERNAL and log on %s", async (_case, outage) => {
        const { error, key } = await lookUp(
            keyProvider(() => Promise.reject(outage)),
            await token("k1"),
        );

        expect(key).toBeUndefined();
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).getResponse()).toEqual({ statusCode: 500, message: "INTERNAL" });
        expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining("JWKS is unavailable"));
    });
});
