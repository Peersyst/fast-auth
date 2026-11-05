import express from "express";
import supertest from "supertest";
import { requestId } from "../../../../src/modules/common/middleware/request-id.middleware";

describe("requestId", () => {
    const app = express()
        .use(requestId)
        .get("/", (_req, res) => {
            res.status(204).end();
        });

    it("should tag each response with a different UUID", async () => {
        const first = await supertest(app).get("/").expect(204);
        const second = await supertest(app).get("/missing").expect(404);

        expect(first.headers["x-request-id"]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(second.headers["x-request-id"]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(second.headers["x-request-id"]).not.toBe(first.headers["x-request-id"]);
    });
});
