import type { AddressInfo } from "node:net";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { Logger } from "@nestjs/common";
import type { JWK, KeyLike } from "jose";
import { exportJWK, generateKeyPair, jwtVerify, SignJWT } from "jose";
import { remoteKeySet } from "./jwt-key-set";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 30 * 1000;

describe("remoteKeySet", () => {
    let server: Server;
    let firstKey: JWK;
    let keys: JWK[];
    let healthy: boolean;
    let stalled: (() => void) | undefined;
    let held: ((respond: () => void) => void) | undefined;
    let fetches: number;
    let privateKey: KeyLike;
    let url: URL;

    beforeAll(async () => {
        const pair = await generateKeyPair("RS256");
        privateKey = pair.privateKey;
        firstKey = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" };
        server = createServer((_request, response) => {
            fetches += 1;
            if (stalled) {
                response.writeHead(200, { "Content-Type": "application/json" }).write("{");
                stalled();
            } else if (held) {
                const body = JSON.stringify({ keys });
                held(() => response.writeHead(200, { "Content-Type": "application/json" }).end(body));
            } else if (healthy) response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ keys }));
            else response.writeHead(503).end();
        });
        await new Promise<void>((resolve) => server.listen(0, resolve));
        url = new URL(`http://localhost:${(server.address() as AddressInfo).port}/.well-known/jwks.json`);
    });

    afterAll(() => {
        server.closeAllConnections();
        return new Promise<void>((resolve) => server.close(() => resolve()));
    });

    beforeEach(() => {
        keys = [firstKey];
        healthy = true;
        fetches = 0;
        stalled = undefined;
        held = undefined;
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    const token = (kid: string): Promise<string> =>
        new SignJWT({}).setProtectedHeader({ alg: "RS256", kid }).setExpirationTime("1h").sign(privateKey);
    const ageCacheBy = (ms: number): void => {
        const now = Date.now();
        jest.spyOn(Date, "now").mockReturnValue(now + ms);
    };

    it("keeps verifying with the last key set fetched when a refetch of a stale set fails, and warns", async () => {
        const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
        const keySet = remoteKeySet(url);
        await jwtVerify(await token("k1"), keySet);
        healthy = false;
        ageCacheBy(TEN_MINUTES_MS + 1);

        await expect(jwtVerify(await token("k1"), keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        expect(fetches).toBe(2);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("JWKS refetch failed, verified with the last key set fetched"));
    });

    it("verifies with the last key set fetched without refetching for 30 s after a refetch fails", async () => {
        jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
        const keySet = remoteKeySet(url);
        await jwtVerify(await token("k1"), keySet);
        healthy = false;
        ageCacheBy(TEN_MINUTES_MS + 1);
        await jwtVerify(await token("k1"), keySet);
        expect(fetches).toBe(2);

        ageCacheBy(COOLDOWN_MS - 1);
        await expect(jwtVerify(await token("k1"), keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        expect(fetches).toBe(2);

        ageCacheBy(1);
        await expect(jwtVerify(await token("k1"), keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        expect(fetches).toBe(3);
    });

    it("gives up on a refetch whose body stalls after 6 s and keeps the last key set until a fresh fetch succeeds", async () => {
        const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
        const keySet = remoteKeySet(url);
        await jwtVerify(await token("k1"), keySet);
        const arrived = new Promise<void>((resolve) => (stalled = resolve));
        ageCacheBy(TEN_MINUTES_MS + 1);
        const stalledToken = await token("k1");
        jest.useFakeTimers({ doNotFake: ["Date", "nextTick", "setImmediate", "queueMicrotask", "hrtime", "performance"] });

        const verified = jwtVerify(stalledToken, keySet);
        await arrived;
        await jest.advanceTimersByTimeAsync(5_999);
        expect(warn).not.toHaveBeenCalled();
        await jest.advanceTimersByTimeAsync(1);
        await expect(verified).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        expect(warn).toHaveBeenCalledWith("JWKS refetch failed, verified with the last key set fetched: request timed out");

        jest.useRealTimers();
        stalled = undefined;
        healthy = false;
        ageCacheBy(COOLDOWN_MS);
        await expect(jwtVerify(await token("k1"), keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        healthy = true;
        ageCacheBy(COOLDOWN_MS);
        await expect(jwtVerify(await token("k1"), keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        expect(fetches).toBe(4);
    });

    it("keeps a key set fetched after a deadline when an older check's deadline passes later", async () => {
        jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
        const keySet = remoteKeySet(url);
        await jwtVerify(await token("k1"), keySet);
        const arrived = new Promise<void>((resolve) => (stalled = resolve));
        ageCacheBy(TEN_MINUTES_MS + 1);
        const k1 = await token("k1");
        jest.useFakeTimers({ doNotFake: ["Date", "nextTick", "setImmediate", "queueMicrotask", "hrtime", "performance"] });

        const first = jwtVerify(k1, keySet);
        await arrived;
        await jest.advanceTimersByTimeAsync(3_000);
        const second = jwtVerify(k1, keySet);
        await jest.advanceTimersByTimeAsync(3_000);
        await expect(first).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        stalled = undefined;
        ageCacheBy(COOLDOWN_MS);
        await expect(jwtVerify(k1, keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        await jest.advanceTimersByTimeAsync(3_000);
        await expect(second).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });

        ageCacheBy(COOLDOWN_MS);
        await expect(jwtVerify(k1, keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        expect(fetches).toBe(3);
    });

    it("refuses a rotated-out key when an older check's deadline passes after a newer key set was fetched", async () => {
        jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
        const keySet = remoteKeySet(url);
        await jwtVerify(await token("k1"), keySet);
        const arrived = new Promise<void>((resolve) => (stalled = resolve));
        ageCacheBy(TEN_MINUTES_MS + 1);
        const k1 = await token("k1");
        const k2 = await token("k2");
        jest.useFakeTimers({ doNotFake: ["Date", "nextTick", "setImmediate", "queueMicrotask", "hrtime", "performance"] });

        const first = jwtVerify(k1, keySet);
        await arrived;
        await jest.advanceTimersByTimeAsync(3_000);
        const second = expect(jwtVerify(k1, keySet)).rejects.toMatchObject({ code: "ERR_JWKS_NO_MATCHING_KEY" });
        await jest.advanceTimersByTimeAsync(3_000);
        await expect(first).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        stalled = undefined;
        keys = [{ ...firstKey, kid: "k2" }];
        ageCacheBy(COOLDOWN_MS);
        await expect(jwtVerify(k2, keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k2" } });
        await jest.advanceTimersByTimeAsync(3_000);
        await second;

        await expect(jwtVerify(k1, keySet)).rejects.toMatchObject({ code: "ERR_JWKS_NO_MATCHING_KEY" });
        await expect(jwtVerify(k2, keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k2" } });
        expect(fetches).toBe(3);
    });

    it("lets an older check answer only its own request while a newer key set is still being fetched", async () => {
        jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
        const keySet = remoteKeySet(url);
        await jwtVerify(await token("k1"), keySet);
        const arrived = new Promise<void>((resolve) => (stalled = resolve));
        ageCacheBy(TEN_MINUTES_MS + 1);
        const k1 = await token("k1");
        const k2 = await token("k2");
        jest.useFakeTimers({ doNotFake: ["Date", "nextTick", "setImmediate", "queueMicrotask", "hrtime", "performance"] });

        const first = expect(jwtVerify(k2, keySet)).rejects.toMatchObject({ code: "ERR_JWKS_TIMEOUT" });
        await arrived;
        await jest.advanceTimersByTimeAsync(3_000);
        const second = jwtVerify(k1, keySet);
        await jest.advanceTimersByTimeAsync(3_000);
        await first;
        stalled = undefined;
        keys = [{ ...firstKey, kid: "k2" }];
        let respond = (): void => undefined;
        const fetching = new Promise<void>((resolve) => {
            held = (send) => {
                respond = send;
                resolve();
            };
        });
        const third = jwtVerify(k2, keySet);
        await fetching;
        await jest.advanceTimersByTimeAsync(3_000);
        await expect(second).resolves.toMatchObject({ protectedHeader: { kid: "k1" } });
        held = undefined;
        respond();
        await expect(third).resolves.toMatchObject({ protectedHeader: { kid: "k2" } });

        await expect(jwtVerify(k1, keySet)).rejects.toMatchObject({ code: "ERR_JWKS_NO_MATCHING_KEY" });
        await expect(jwtVerify(k2, keySet)).resolves.toMatchObject({ protectedHeader: { kid: "k2" } });
        expect(fetches).toBe(3);
    });

    it("rethrows the outage when the last key set fetched does not hold the token's key either", async () => {
        const keySet = remoteKeySet(url);
        await jwtVerify(await token("k1"), keySet);
        healthy = false;
        ageCacheBy(TEN_MINUTES_MS + 1);

        await expect(jwtVerify(await token("k2"), keySet)).rejects.toMatchObject({ code: "ERR_JOSE_GENERIC" });
    });

    it("stops verifying a key the endpoint removed once a refetch succeeds", async () => {
        const keySet = remoteKeySet(url);
        await jwtVerify(await token("k1"), keySet);
        keys = [{ ...firstKey, kid: "k2" }];
        ageCacheBy(TEN_MINUTES_MS + 1);

        await expect(jwtVerify(await token("k1"), keySet)).rejects.toMatchObject({ code: "ERR_JWKS_NO_MATCHING_KEY" });
    });

    it("rethrows the outage when no key set was ever fetched", async () => {
        healthy = false;

        await expect(jwtVerify(await token("k1"), remoteKeySet(url))).rejects.toMatchObject({ code: "ERR_JOSE_GENERIC" });
    });
});
