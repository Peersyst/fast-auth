import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./utils/test-app";

describe("error envelope", () => {
    let app: NestExpressApplication;

    beforeAll(async () => {
        app = await createTestApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it("answers an unknown path with 404 NOT_FOUND", async () => {
        await request(app.getHttpServer())
            .get("/api/console/nope")
            .expect(404, { statusCode: 404, code: "NOT_FOUND", message: "not found" });
    });

    it("answers a wrong method with 405 VALIDATION_FAILED", async () => {
        await request(app.getHttpServer())
            .post("/api/console/livez")
            .expect(405, { statusCode: 405, code: "VALIDATION_FAILED", message: "POST method not allowed" });
    });
});
