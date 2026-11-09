import { createLocalJWKSet, exportJWK, exportSPKI, generateKeyPair, JWTVerifyGetKey, KeyLike, SignJWT } from "jose";
import { keyProvider } from "../../../src/modules/auth/jwt-key-set";

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

    it("should answer no key when the key set is unavailable", async () => {
        const provider = keyProvider(() => Promise.reject(new TypeError("fetch failed")));

        await expect(lookUp(provider, await token("k1"))).resolves.toEqual({ error: null, key: undefined });
    });
});
