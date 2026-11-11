import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { createLocalJWKSet, JWTPayload } from "jose";
import { JWT_KEY_SET } from "../../../../src/modules/auth/jwt-key-set";
import { Auth0JwtStrategy } from "../../../../src/modules/auth/strategy/auth0-jwt.strategy";
import { ADMIN_EMAIL, createConfigServiceMock } from "../../../mocks/config/config.mock";

describe("Auth0JwtStrategy", () => {
    let strategy: Auth0JwtStrategy;
    const claims = (changes: JWTPayload = {}): JWTPayload => ({
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

    describe("validate", () => {
        it("should turn verified claims into a user", () => {
            expect(strategy.validate(claims())).toEqual({
                email: "Alice@Example.com",
                emailVerified: true,
                role: "user",
            });
        });

        it("should make a verified email in ADMIN_EMAILS an admin, in any case", () => {
            expect(strategy.validate(claims({ email: ADMIN_EMAIL.toUpperCase() }))).toEqual({
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
                email: ADMIN_EMAIL,
                emailVerified: false,
                role: "user",
            });
        });

        it.each<[string, JWTPayload]>([
            ["no email", { email: undefined }],
            ["an empty email", { email: "" }],
        ])("should refuse %s with 403 EMAIL_REQUIRED", (_case, changes) => {
            expect(() => strategy.validate(claims(changes))).toThrow(expect.objectContaining({ status: 403, message: "EMAIL_REQUIRED" }));
        });
    });
});
