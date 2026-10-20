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

    it("answers an unknown path with 404 NOT_FOUND, inside the API prefix or not", async () => {
        const notFound = { statusCode: 404, code: "NOT_FOUND", message: "Not found." };

        await request(app.getHttpServer()).get("/api/console/nope").expect(404, notFound);
        await request(app.getHttpServer()).get("/nope").expect(404, notFound);
    });

    it("answers a wrong method with 405 VALIDATION_FAILED", async () => {
        await request(app.getHttpServer())
            .post("/api/console/livez")
            .expect(405, { statusCode: 405, code: "VALIDATION_FAILED", message: "The request is invalid." });
    });

    it("answers an unknown query parameter with a detail naming it", async () => {
        await request(app.getHttpServer())
            .get("/api/console/livez?foo=1")
            .expect(400, {
                statusCode: 400,
                code: "VALIDATION_FAILED",
                message: "The request is invalid.",
                details: [{ field: "foo", constraint: "invalid" }],
            });
    });

    it("answers malformed JSON without echoing the body", async () => {
        await request(app.getHttpServer())
            .post("/api/console/livez")
            .set("Content-Type", "application/json")
            .send(`{"secretToken": abc}`)
            .expect(400, { statusCode: 400, code: "VALIDATION_FAILED", message: "The request is invalid." });
    });
});
