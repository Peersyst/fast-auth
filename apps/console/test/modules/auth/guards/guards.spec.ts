import type { ExecutionContext } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import type { JWTPayload, JWTVerifyGetKey, KeyLike } from "jose";
import { createLocalJWKSet, errors, exportJWK, generateKeyPair, SignJWT } from "jose";
import { TEST_CONFIG } from "../../../utils/test-config";
import type { ConsoleConfig } from "../../../../src/config/console-config";
import { Public } from "../../../../src/modules/common/decorators/public.decorator";
import { Roles } from "../../../../src/modules/common/decorators/roles.decorator";
import { ConsoleException } from "../../../../src/modules/common/exception/console.exception";
import type { ErrorResponse } from "../../../../src/modules/common/responses/error.response";
import { AllowUnverifiedEmail } from "../../../../src/modules/common/decorators/allow-unverified-email.decorator";
import { JWT_KEY_SET } from "../../../../src/modules/auth/jwt-key-set";
import { Role } from "../../../../src/modules/auth/session-user";
import { ConfiguredThrottlerModule, SubmitDappThrottle } from "../../../../src/modules/auth/throttle-limits";
import { JwtAuthGuard } from "../../../../src/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../src/modules/auth/guards/roles.guard";
import { ThrottlerBySubGuard } from "../../../../src/modules/auth/guards/throttler-by-sub.guard";
import { VerifiedEmailGuard } from "../../../../src/modules/auth/guards/verified-email.guard";

class TestRoutes {
    /** A route without a token. */
    @Public()
    publicRoute(): void {}

    /** A route limited to five requests a minute per subject. */
    @SubmitDappThrottle()
    throttledRoute(): void {}

    /** A route open to unverified emails. */
    @AllowUnverifiedEmail()
    unverifiedRoute(): void {}

    /** A route for admins only. */
    @Roles(Role.ADMIN)
    adminRoute(): void {}

    /** A route with no decorator, so every guard applies its default. */
    plainRoute(): void {}
}

/**
 * Builds the context a guard sees for a request to one of the test routes.
 * @param route The test route.
 * @param request The request the guard reads.
 * @returns The execution context.
 */
function routeContext(route: keyof TestRoutes, request: object): ExecutionContext {
    return new ExecutionContextHost([request, {}], TestRoutes, TestRoutes.prototype[route]);
}

/**
 * Runs a guard check expected to refuse and returns the error envelope it threw.
 * @param run The guard check.
 * @returns The error envelope.
 */
async function refusal(run: () => unknown): Promise<ErrorResponse> {
    try {
        await run();
    } catch (error) {
        if (error instanceof ConsoleException) return error.body;
        throw error;
    }
    throw new Error("The guard let the request through");
}

/**
 * Builds the JWT auth guard through a Nest testing module, verifying against the given key set.
 * @param keySet The key lookup the guard verifies tokens with.
 * @returns The guard.
 */
async function createJwtAuthGuard(keySet: JWTVerifyGetKey): Promise<JwtAuthGuard> {
    const module = await Test.createTestingModule({
        providers: [
            JwtAuthGuard,
            { provide: ConfigService, useValue: new ConfigService<ConsoleConfig, true>(TEST_CONFIG) },
            { provide: JWT_KEY_SET, useValue: keySet },
        ],
    }).compile();
    return module.get(JwtAuthGuard);
}

const { loginDomain: LOGIN_DOMAIN, consoleClientId: CLIENT_ID } = TEST_CONFIG.auth0;
const VERIFIED = { email: "alice@example.com", email_verified: true };
/**
 * Turns an offset from now into a JWT NumericDate.
 * @param seconds The offset in seconds, negative for the past.
 * @returns The NumericDate.
 */
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
        guard = await createJwtAuthGuard(keySet);
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

    describe("canActivate", () => {
        it("should let @Public() routes through without a token", async () => {
            expect(await authorize(undefined, "publicRoute")).toEqual({ allowed: true, user: undefined });
        });

        it("should attach a user for a valid token", async () => {
            expect(await authorize(await sign(VERIFIED))).toEqual({
                allowed: true,
                user: { sub: "auth0|user", email: "alice@example.com", emailVerified: true, role: "user" },
            });
        });

        it("should make a verified email in ADMIN_EMAILS an admin, case-insensitively", async () => {
            const { user } = await authorize(await sign({ email: "Admin@Example.test", email_verified: true }));

            expect(user).toMatchObject({ role: "admin", emailVerified: true });
        });

        it("should keep an unverified email in ADMIN_EMAILS a user", async () => {
            const { user } = await authorize(await sign({ email: "admin@example.test", email_verified: false }));

            expect(user).toMatchObject({ role: "user", emailVerified: false });
        });

        it("should accept a token that expired 30 s ago, within the 60 s clock tolerance", async () => {
            expect((await authorize(await sign(VERIFIED, { exp: secondsFromNow(-30) }))).allowed).toBe(true);
        });

        it("should refuse a missing token with the UNAUTHENTICATED envelope", async () => {
            expect(await refusal(() => authorize(undefined))).toEqual({
                statusCode: 401,
                code: "UNAUTHENTICATED",
                message: "A valid ID token is required.",
            });
        });

        it("should refuse an Authorization header that is not a Bearer token", async () => {
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
        ])("should refuse a token %s with UNAUTHENTICATED", async (_name, changes) => {
            const token = await sign(VERIFIED, changes());

            expect(await refusal(() => authorize(token))).toMatchObject({ statusCode: 401, code: "UNAUTHENTICATED" });
        });

        it("should accept a token for several audiences whose authorized party is the console", async () => {
            const token = await sign(VERIFIED, { audience: [CLIENT_ID, "another-client"], azp: CLIENT_ID });

            expect((await authorize(token)).allowed).toBe(true);
        });

        it("should refuse a token without an email claim with the EMAIL_REQUIRED envelope", async () => {
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
        ])("should rethrow %s instead of refusing with UNAUTHENTICATED", async (_name, outage) => {
            const outageGuard = await createJwtAuthGuard(async () => {
                throw outage;
            });
            const request = { headers: { authorization: `Bearer ${await sign(VERIFIED)}` } };

            await expect(outageGuard.canActivate(routeContext("plainRoute", request))).rejects.toBe(outage);
        });
    });
});

describe("ThrottlerBySubGuard", () => {
    let module: TestingModule;
    let guard: ThrottlerBySubGuard;

    /**
     * Builds the guard through a Nest testing module whose throttler reads these throttle settings.
     * @param throttle The throttle settings.
     */
    async function createModule(throttle: ConsoleConfig["throttle"]): Promise<void> {
        const config = { ...TEST_CONFIG, throttle };
        module = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, skipProcessEnv: true, load: [() => config] }),
                ConfiguredThrottlerModule,
            ],
            providers: [ThrottlerBySubGuard],
        }).compile();
        await module.init();
        guard = module.get(ThrottlerBySubGuard);
    }

    beforeEach(async () => {
        await createModule(TEST_CONFIG.throttle);
    });

    afterEach(() => module.close());

    const call = (route: "throttledRoute" | "plainRoute", sub: string): Promise<boolean> =>
        guard.canActivate(routeContext(route, { user: { sub }, headers: {} }));

    describe("canActivate", () => {
        it("should limit a throttled route per sub and refuse with the RATE_LIMITED envelope", async () => {
            for (let i = 0; i < 5; i++) await call("throttledRoute", "auth0|alice");

            expect(await refusal(() => call("throttledRoute", "auth0|alice"))).toEqual({
                statusCode: 429,
                code: "RATE_LIMITED",
                message: "Too many requests. Try again later.",
            });
            expect(await call("throttledRoute", "auth0|bob")).toBe(true);
        });

        it("should limit a throttled route to the requests per minute its throttle setting holds", async () => {
            await module.close();
            await createModule({ ...TEST_CONFIG.throttle, submitDappPerMinute: 2 });
            for (let i = 0; i < 2; i++) await call("throttledRoute", "auth0|alice");

            expect((await refusal(() => call("throttledRoute", "auth0|alice"))).code).toBe("RATE_LIMITED");
        });

        it("should never limit a route without a throttle decorator", async () => {
            for (let i = 0; i < 10; i++) expect(await call("plainRoute", "auth0|alice")).toBe(true);
        });
    });
});

describe("VerifiedEmailGuard", () => {
    let guard: VerifiedEmailGuard;

    beforeAll(async () => {
        guard = (await Test.createTestingModule({ providers: [VerifiedEmailGuard] }).compile()).get(VerifiedEmailGuard);
    });

    const check = (route: "plainRoute" | "publicRoute" | "unverifiedRoute", emailVerified: boolean) =>
        guard.canActivate(routeContext(route, { user: { emailVerified } }));

    describe("canActivate", () => {
        it("should refuse an unverified email with the EMAIL_NOT_VERIFIED envelope", async () => {
            expect(await refusal(() => check("plainRoute", false))).toEqual({
                statusCode: 403,
                code: "EMAIL_NOT_VERIFIED",
                message: "Verify your email address to continue.",
            });
        });

        it("should let a verified email through", () => {
            expect(check("plainRoute", true)).toBe(true);
        });

        it.each(["publicRoute", "unverifiedRoute"] as const)("should let an unverified email through on %s", (route) => {
            expect(check(route, false)).toBe(true);
        });
    });
});

describe("RolesGuard", () => {
    let guard: RolesGuard;

    beforeAll(async () => {
        guard = (await Test.createTestingModule({ providers: [RolesGuard] }).compile()).get(RolesGuard);
    });

    const check = (route: "plainRoute" | "adminRoute", role: Role) => guard.canActivate(routeContext(route, { user: { role } }));

    describe("canActivate", () => {
        it("should refuse a user on an admin route with the FORBIDDEN_ROLE envelope", async () => {
            expect(await refusal(() => check("adminRoute", Role.USER))).toEqual({
                statusCode: 403,
                code: "FORBIDDEN_ROLE",
                message: "Your role does not allow this action.",
            });
        });

        it("should let an admin through an admin route and anyone through a route without roles", () => {
            expect(check("adminRoute", Role.ADMIN)).toBe(true);
            expect(check("plainRoute", Role.USER)).toBe(true);
        });
    });
});
