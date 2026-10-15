import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { ADMIN_EMAIL } from "./utils/contract";
import { createTestApp } from "./utils/test-app";
import type { TokenOptions } from "./utils/tokens";
import { signToken } from "./utils/tokens";

describe("GET /me", () => {
    let app: NestExpressApplication;

    beforeAll(async () => {
        app = await createTestApp();
    });

    afterAll(async () => {
        await app.close();
    });

    const me = async (options: TokenOptions): Promise<request.Response> =>
        request(app.getHttpServer())
            .get("/api/console/me")
            .set("Authorization", `Bearer ${await signToken(options)}`);

    it("returns a verified user", async () => {
        const response = await me({ sub: "auth0|alice", email: "alice@acme.xyz" });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ email: "alice@acme.xyz", role: "user", emailVerified: true });
    });

    it("returns role admin for a verified email listed in ADMIN_EMAILS", async () => {
        const response = await me({ sub: "auth0|admin", email: ADMIN_EMAIL });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ email: ADMIN_EMAIL, role: "admin", emailVerified: true });
    });

    it("returns role user for an unverified email listed in ADMIN_EMAILS", async () => {
        const response = await me({ sub: "auth0|impostor", email: ADMIN_EMAIL, emailVerified: false });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ email: ADMIN_EMAIL, role: "user", emailVerified: false });
    });

    it.each([
        ["no Authorization header", undefined],
        ["a Basic Authorization header", "Basic dXNlcjpwYXNz"],
        ["a Bearer token that is not a JWT", "Bearer garbage"],
    ])("refuses a request with %s with the UNAUTHENTICATED envelope", async (_case, authorization) => {
        const call = request(app.getHttpServer()).get("/api/console/me");
        const response = await (authorization === undefined ? call : call.set("Authorization", authorization));

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ statusCode: 401, code: "UNAUTHENTICATED", message: "A valid ID token is required." });
    });
});
