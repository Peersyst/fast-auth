import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { createLocalJWKSet, JWTPayload } from "jose";
import { BusinessException } from "../../../../src/modules/common/exception/business.exception";
import { JWT_KEY_SET } from "../../../../src/modules/auth/jwt-key-set";
import { Auth0JwtStrategy } from "../../../../src/modules/auth/strategy/auth0-jwt.strategy";
import { createConfigServiceMock } from "../../../mocks/config/config.mock";
import { ADMIN_EMAIL, testConfig } from "../../../mocks/config/config.mock";

const { consoleClientId } = testConfig().auth0;

describe("Auth0JwtStrategy", () => {
    let strategy: Auth0JwtStrategy;
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const claims = (changes: JWTPayload = {}): JWTPayload => ({
        sub: "auth0|alice",
        exp,
        aud: consoleClientId,
        email: "Alice@Example.com",
        email_verified: true,
        ...changes,
    });

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            providers: [
                Auth0JwtStrategy,
                { provide: ConfigService, useValue: createConfigServiceMock() },
                { provide: JWT_KEY_SET, useValue: createLocalJWKSet({ keys: [] }) },
            ],
        }).compile();
        strategy = module.get(Auth0JwtStrategy);
    });

    /**
     * Runs validate on claims expected to be refused.
     * @param payload The claims.
     * @returns The status and message of the business error thrown.
     */
    const refusal = (payload: JWTPayload): { status: number; message: string } => {
        try {
            strategy.validate(payload);
        } catch (error) {
            if (error instanceof BusinessException) return { status: error.getStatus(), message: error.message };
            throw error;
        }
        throw new Error("expected a refusal");
    };

    describe("validate", () => {
        it("should turn verified claims into a user", () => {
            expect(strategy.validate(claims())).toEqual({
                sub: "auth0|alice",
                email: "Alice@Example.com",
                emailVerified: true,
                role: "user",
            });
        });

        it("should make a verified email in ADMIN_EMAILS an admin, in any case", () => {
            expect(strategy.validate(claims({ email: ADMIN_EMAIL.toUpperCase() }))).toEqual({
                sub: "auth0|alice",
                email: ADMIN_EMAIL.toUpperCase(),
                emailVerified: true,
                role: "admin",
            });
        });

        it.each<[string, unknown]>([
            ["false", false],
            ["the string true", "true"],
            ["missing", undefined],
        ])("should keep an admin email whose email_verified is %s an unverified user", (_case, emailVerified) => {
            expect(strategy.validate(claims({ email: ADMIN_EMAIL, email_verified: emailVerified }))).toEqual({
                sub: "auth0|alice",
                email: ADMIN_EMAIL,
                emailVerified: false,
                role: "user",
            });
        });

        it("should accept several audiences when the console is the authorized party", () => {
            expect(strategy.validate(claims({ aud: [consoleClientId, "other-client"], azp: consoleClientId }))).toMatchObject({
                sub: "auth0|alice",
            });
        });

        it.each<[string, JWTPayload]>([
            ["no sub", { sub: undefined }],
            ["an empty sub", { sub: "" }],
            ["a sub that is not a string", { sub: 42 as unknown as string }],
            ["no exp", { exp: undefined }],
            ["an exp that is not a number", { exp: "soon" as unknown as number }],
            ["another authorized party", { azp: "other-client" }],
            ["several audiences without an authorized party", { aud: [consoleClientId, "other-client"] }],
        ])("should refuse %s with 401 UNAUTHENTICATED", (_case, changes) => {
            expect(refusal(claims(changes))).toEqual({ status: 401, message: "UNAUTHENTICATED" });
        });

        it.each<[string, JWTPayload]>([
            ["no email", { email: undefined }],
            ["an empty email", { email: "" }],
        ])("should refuse %s with 403 EMAIL_REQUIRED", (_case, changes) => {
            expect(refusal(claims(changes))).toEqual({ status: 403, message: "EMAIL_REQUIRED" });
        });
    });
});
