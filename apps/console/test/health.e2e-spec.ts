import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./utils/test-app";

describe("health", () => {
    let app: NestExpressApplication;

    beforeAll(async () => {
        app = await createTestApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it("GET /livez answers without a token", async () => {
        await request(app.getHttpServer()).get("/api/console/livez").expect(200, { status: "ok" });
    });

    it("GET /readyz answers ok when the database is reachable", async () => {
        await request(app.getHttpServer()).get("/api/console/readyz").expect(200, { status: "ok" });
    });

    it("sends the explicit security headers", async () => {
        const response = await request(app.getHttpServer()).get("/api/console/livez").expect(200);

        const csp = response.headers["content-security-policy"];
        expect(csp).toContain("worker-src 'self' blob:");
        expect(csp).toContain("frame-src https://login.console.test");
        expect(csp).toContain("connect-src 'self' https://login.console.test");
        expect(response.headers["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
        expect(response.headers["cross-origin-embedder-policy"]).toBeUndefined();
        expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
});
