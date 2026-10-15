import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { ThrottlerStorageService } from "@nestjs/throttler";
import type { JWTPayload, JWTVerifyGetKey, KeyLike } from "jose";
import { createLocalJWKSet, errors, exportJWK, generateKeyPair, SignJWT } from "jose";
import { TEST_CONFIG } from "../../../../test/utils/test-config";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ConsoleException } from "../../common/exception/console.exception";
import type { ErrorResponse } from "../../common/response/error.response";
import { AllowUnverifiedEmail } from "../../common/decorators/allow-unverified-email.decorator";
import { Role } from "../session-user";
import { SubmitDappThrottle } from "../throttle-limits";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { ThrottlerBySubGuard } from "./throttler-by-sub.guard";
import { VerifiedEmailGuard } from "./verified-email.guard";

class TestRoutes {
    @Public()
    publicRoute(): void {}

    @SubmitDappThrottle()
    throttledRoute(): void {}

    @AllowUnverifiedEmail()
    unverifiedRoute(): void {}

    @Roles(Role.Admin)
    adminRoute(): void {}

    plainRoute(): void {}
}

function routeContext(route: keyof TestRoutes, request: object): ExecutionContext {
    return new ExecutionContextHost([request, {}], TestRoutes, TestRoutes.prototype[route]);
}

async function refusal(run: () => unknown): Promise<ErrorResponse> {
    try {
        await run();
    } catch (error) {
        if (error instanceof ConsoleException) return error.body;
        throw error;
    }
    throw new Error("The guard let the request through");
}

const { loginDomain: LOGIN_DOMAIN, consoleClientId: CLIENT_ID } = TEST_CONFIG.auth0;
const VERIFIED = { email: "alice@example.com", email_verified: true };
const secondsFromNow = (seconds: number): number => Math.floor(Date.now() / 1000) + seconds;

type TokenChanges = {
    key?: KeyLike;
    alg?: "RS256" | "HS256";
    sub?: string;
    issuer?: string;
    audience?: string | string[];
    azp?: string;
    exp?: number | null;
};

describe("JwtAuthGuard", () => {
    let privateKey: KeyLike;
    let otherPrivateKey: KeyLike;
    let guard: JwtAuthGuard;

    beforeAll(async () => {
        const pair = await generateKeyPair("RS256");
        privateKey = pair.privateKey;
        otherPrivateKey = (await generateKeyPair("RS256")).privateKey;
        const keySet: JWTVerifyGetKey = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" }] });
        guard = new JwtAuthGuard(new Reflector(), TEST_CONFIG, keySet);
    });

    const sign = (claims: JWTPayload, changes: TokenChanges = {}): Promise<string> => {
        const { alg = "RS256", sub = "auth0|user", issuer = `https://${LOGIN_DOMAIN}/`, audience = CLIENT_ID, azp } = changes;
        const exp = changes.exp === undefined ? secondsFromNow(3600) : changes.exp;
        const jwt = new SignJWT({ ...claims, ...(azp !== undefined && { azp }) })
            .setProtectedHeader({ alg, kid: "k1" })
            .setSubject(sub)
            .setIssuer(issuer)
            .setAudience(audience);
        if (exp !== null) jwt.setExpirationTime(exp);
        return jwt.sign(alg === "HS256" ? new TextEncoder().encode("a-shared-secret-of-at-least-32-bytes") : (changes.key ?? privateKey));
    };

    const authorize = async (token: string | undefined, route: "plainRoute" | "publicRoute" = "plainRoute") => {
        const request: Record<string, unknown> = { headers: token ? { authorization: `Bearer ${token}` } : {} };
        const allowed = await guard.canActivate(routeContext(route, request));
        return { allowed, user: request.user };
    };

    it("lets @Public() routes through without a token", async () => {
        expect(await authorize(undefined, "publicRoute")).toEqual({ allowed: true, user: undefined });
    });

    it("attaches a user for a valid token", async () => {
        expect(await authorize(await sign(VERIFIED))).toEqual({
            allowed: true,
            user: { sub: "auth0|user", email: "alice@example.com", emailVerified: true, role: "user" },
        });
    });

    it("makes a verified email in ADMIN_EMAILS an admin, case-insensitively", async () => {
        const { user } = await authorize(await sign({ email: "Admin@Example.test", email_verified: true }));

        expect(user).toMatchObject({ role: "admin", emailVerified: true });
    });

    it("keeps an unverified email in ADMIN_EMAILS a user", async () => {
        const { user } = await authorize(await sign({ email: "admin@example.test", email_verified: false }));

        expect(user).toMatchObject({ role: "user", emailVerified: false });
    });

    it("accepts a token that expired 30 s ago, within the 60 s clock tolerance", async () => {
        expect((await authorize(await sign(VERIFIED, { exp: secondsFromNow(-30) }))).allowed).toBe(true);
    });

    it("refuses a missing token with the UNAUTHENTICATED envelope", async () => {
        expect(await refusal(() => authorize(undefined))).toEqual({
            statusCode: 401,
            code: "UNAUTHENTICATED",
            message: "A valid ID token is required.",
        });
    });

    it("refuses an Authorization header that is not a Bearer token", async () => {
        const request = { headers: { authorization: "Basic dXNlcjpwYXNz" } };

        expect(await refusal(() => guard.canActivate(routeContext("plainRoute", request)))).toMatchObject({ code: "UNAUTHENTICATED" });
    });

    it.each<[string, () => TokenChanges]>([
        ["signed with another key", () => ({ key: otherPrivateKey })],
        ["signed with HS256, whatever the key", () => ({ alg: "HS256" })],
        ["from another issuer", () => ({ issuer: "https://evil.example.com/" })],
        ["for another client", () => ({ audience: "another-client" })],
        ["without an exp claim, which would never expire", () => ({ exp: null })],
        ["that expired 120 s ago, beyond the clock tolerance", () => ({ exp: secondsFromNow(-120) })],
        ["with an empty sub", () => ({ sub: "" })],
        ["for several audiences without an authorized party", () => ({ audience: [CLIENT_ID, "another-client"] })],
        [
            "for several audiences with another client as authorized party",
            () => ({ audience: [CLIENT_ID, "another-client"], azp: "another-client" }),
        ],
        ["for the console with another client as authorized party", () => ({ azp: "another-client" })],
    ])("refuses a token %s with UNAUTHENTICATED", async (_name, changes) => {
        const token = await sign(VERIFIED, changes());

        expect(await refusal(() => authorize(token))).toMatchObject({ statusCode: 401, code: "UNAUTHENTICATED" });
    });

    it("accepts a token for several audiences whose authorized party is the console", async () => {
        const token = await sign(VERIFIED, { audience: [CLIENT_ID, "another-client"], azp: CLIENT_ID });

        expect((await authorize(token)).allowed).toBe(true);
    });

    it("refuses a token without an email claim with the EMAIL_REQUIRED envelope", async () => {
        expect(await refusal(async () => authorize(await sign({})))).toEqual({
            statusCode: 403,
            code: "EMAIL_REQUIRED",
            message: "The ID token has no email claim.",
        });
    });

    it.each([
        ["a key-set fetch timeout", new errors.JWKSTimeout()],
        ["a non-200 key-set response", new errors.JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response")],
        ["a malformed key set", new errors.JWKSInvalid("JSON Web Key Set malformed")],
    ])("rethrows %s instead of refusing with UNAUTHENTICATED", async (_name, outage) => {
        const outageGuard = new JwtAuthGuard(new Reflector(), TEST_CONFIG, async () => {
            throw outage;
        });
        const request = { headers: { authorization: `Bearer ${await sign(VERIFIED)}` } };

        await expect(outageGuard.canActivate(routeContext("plainRoute", request))).rejects.toBe(outage);
    });
});

describe("ThrottlerBySubGuard", () => {
    let guard: ThrottlerBySubGuard;

    beforeEach(async () => {
        guard = new ThrottlerBySubGuard([{ ttl: 60_000, limit: 1 }], new ThrottlerStorageService(), new Reflector());
        await guard.onModuleInit();
    });

    const call = (route: "throttledRoute" | "plainRoute", sub: string): Promise<boolean> =>
        guard.canActivate(routeContext(route, { user: { sub }, headers: {} }));

    it("limits a throttled route per sub and refuses with the RATE_LIMITED envelope", async () => {
        for (let i = 0; i < 5; i++) await call("throttledRoute", "auth0|alice");

        expect(await refusal(() => call("throttledRoute", "auth0|alice"))).toEqual({
            statusCode: 429,
            code: "RATE_LIMITED",
            message: "Too many requests. Try again later.",
        });
        expect(await call("throttledRoute", "auth0|bob")).toBe(true);
    });

    it("never limits a route without a throttle decorator", async () => {
        for (let i = 0; i < 10; i++) expect(await call("plainRoute", "auth0|alice")).toBe(true);
    });
});

describe("VerifiedEmailGuard", () => {
    const guard = new VerifiedEmailGuard(new Reflector());
    const check = (route: "plainRoute" | "publicRoute" | "unverifiedRoute", emailVerified: boolean) =>
        guard.canActivate(routeContext(route, { user: { emailVerified } }));

    it("refuses an unverified email with the EMAIL_NOT_VERIFIED envelope", async () => {
        expect(await refusal(() => check("plainRoute", false))).toEqual({
            statusCode: 403,
            code: "EMAIL_NOT_VERIFIED",
            message: "Verify your email address to continue.",
        });
    });

    it("lets a verified email through", () => {
        expect(check("plainRoute", true)).toBe(true);
    });

    it.each(["publicRoute", "unverifiedRoute"] as const)("lets an unverified email through on %s", (route) => {
        expect(check(route, false)).toBe(true);
    });
});

describe("RolesGuard", () => {
    const guard = new RolesGuard(new Reflector());
    const check = (route: "plainRoute" | "adminRoute", role: Role) => guard.canActivate(routeContext(route, { user: { role } }));

    it("refuses a user on an admin route with the FORBIDDEN_ROLE envelope", async () => {
        expect(await refusal(() => check("adminRoute", Role.User))).toEqual({
            statusCode: 403,
            code: "FORBIDDEN_ROLE",
            message: "Your role does not allow this action.",
        });
    });

    it("lets an admin through an admin route and anyone through a route without roles", () => {
        expect(check("adminRoute", Role.Admin)).toBe(true);
        expect(check("plainRoute", Role.User)).toBe(true);
    });
});
