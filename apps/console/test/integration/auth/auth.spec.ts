import { closeTestApp, createTestApp, TestApp } from "@backend/test";
import { Controller, Get, Module } from "@nestjs/common";
import { generateKeyPair, KeyLike } from "jose";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../../../src/modules/auth/auth.module";
import { AdminAuthenticated, Authenticated } from "../../../src/modules/auth/decorator/authenticated.decorator";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { ADMIN_EMAIL, testConfig } from "../../mocks/config/config.mock";
import { signToken, testKeySet, TokenOptions } from "../../mocks/auth/token.mock";

@Authenticated()
@Controller("owner-only")
class OwnerOnlyController {
    /**
     * A route for verified users.
     * @returns A marker body.
     */
    @Get()
    get(): { ok: true } {
        return { ok: true };
    }
}

@AdminAuthenticated()
@Controller("admin-only")
class AdminOnlyController {
    /**
     * A route for admins.
     * @returns A marker body.
     */
    @Get()
    get(): { ok: true } {
        return { ok: true };
    }
}

@Module({ imports: [AuthModule], controllers: [OwnerOnlyController, AdminOnlyController] })
class GuardedRoutesModule {}

describe("AuthModule (integration)", () => {
    let testApp: TestApp;

    /**
     * Builds the Authorization header of a signed-in user.
     * @param email The user's email.
     * @param emailVerified Whether the email is verified.
     * @returns The header value.
     */
    const bearer = async (email: string, emailVerified = true): Promise<string> =>
        `Bearer ${await signToken({ sub: `auth0|${email}`, email, emailVerified })}`;

    let otherKey: KeyLike;

    beforeAll(async () => {
        otherKey = (await generateKeyPair("RS256")).privateKey;
        testApp = await createTestApp({
            imports: [ConfigModule.forRoot({ load: [testConfig], isGlobal: true }), AuthModule, GuardedRoutesModule],
            overrides: [{ provide: JWT_KEY_SET, useValue: await testKeySet() }],
        });
    });

    afterAll(async () => {
        await closeTestApp(testApp.app);
    });

    describe("GET /me", () => {
        it("should answer the session user, unverified emails included", async () => {
            const { body } = await testApp.request
                .get("/me")
                .set("Authorization", await bearer("bob@owners.test", false))
                .expect(200);

            expect(body).toEqual({ email: "bob@owners.test", role: "user", emailVerified: false });
        });

        it("should answer an admin's role", async () => {
            const { body } = await testApp.request
                .get("/me")
                .set("Authorization", await bearer(ADMIN_EMAIL))
                .expect(200);

            expect(body).toEqual({ email: ADMIN_EMAIL, role: "admin", emailVerified: true });
        });

        it("should answer 401 UNAUTHENTICATED without a token", async () => {
            const { body } = await testApp.request.get("/me").expect(401);

            expect(body).toEqual({ statusCode: 401, message: "UNAUTHENTICATED" });
        });
    });

    describe("ID token", () => {
        const now = (): number => Math.floor(Date.now() / 1000);
        const alice: TokenOptions = { sub: "auth0|alice", email: "alice@owners.test" };

        it.each<[string, () => Promise<string>]>([
            ["a Basic scheme", async () => `Basic ${await signToken(alice)}`],
            ["a Bearer scheme without a token", async () => "Bearer "],
            ["a malformed token", async () => "Bearer not.a.jwt"],
            ["another issuer", async () => `Bearer ${await signToken({ ...alice, issuer: "https://evil.example.com/" })}`],
            ["another audience", async () => `Bearer ${await signToken({ ...alice, audience: "other-client" })}`],
            ["an expired token", async () => `Bearer ${await signToken({ ...alice, expiresAt: now() - 120 })}`],
            ["an HS256 token", async () => `Bearer ${await signToken({ ...alice, alg: "HS256" })}`],
            ["a token signed by another key", async () => `Bearer ${await signToken({ ...alice, key: otherKey })}`],
        ])("should answer 401 UNAUTHENTICATED for %s", async (_case, authorization) => {
            const { body } = await testApp.request
                .get("/me")
                .set("Authorization", await authorization())
                .expect(401);

            expect(body).toEqual({ statusCode: 401, message: "UNAUTHENTICATED" });
        });

        it.each<[string, () => Promise<string>]>([
            ["a Bearer scheme followed by two spaces", async () => `Bearer  ${await signToken(alice)}`],
        ])("should accept %s", async (_case, authorization) => {
            const { body } = await testApp.request
                .get("/me")
                .set("Authorization", await authorization())
                .expect(200);

            expect(body).toEqual({ email: "alice@owners.test", role: "user", emailVerified: true });
        });

        it("should answer 403 EMAIL_REQUIRED for a token without an email", async () => {
            const { body } = await testApp.request
                .get("/me")
                .set("Authorization", `Bearer ${await signToken({ sub: "auth0|alice" })}`)
                .expect(403);

            expect(body).toEqual({ statusCode: 403, message: "EMAIL_REQUIRED" });
        });
    });

    describe("guards", () => {
        it("should refuse an unverified user with 403 EMAIL_NOT_VERIFIED", async () => {
            const { body } = await testApp.request
                .get("/owner-only")
                .set("Authorization", await bearer("bob@owners.test", false))
                .expect(403);

            expect(body).toMatchObject({ message: "EMAIL_NOT_VERIFIED" });
        });

        it("should check the verified email before the role", async () => {
            const { body } = await testApp.request
                .get("/admin-only")
                .set("Authorization", await bearer(ADMIN_EMAIL, false))
                .expect(403);

            expect(body).toMatchObject({ message: "EMAIL_NOT_VERIFIED" });
        });

        it("should refuse a user on an admin route with 403 FORBIDDEN_ROLE", async () => {
            const { body } = await testApp.request
                .get("/admin-only")
                .set("Authorization", await bearer("bob@owners.test"))
                .expect(403);

            expect(body).toEqual({ statusCode: 403, message: "FORBIDDEN_ROLE" });
        });

        it("should let an admin through an admin route", async () => {
            const { body } = await testApp.request
                .get("/admin-only")
                .set("Authorization", await bearer(ADMIN_EMAIL))
                .expect(200);

            expect(body).toEqual({ ok: true });
        });
    });
});
