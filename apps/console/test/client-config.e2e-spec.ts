import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./utils/test-app";

describe("client config", () => {
    let app: NestExpressApplication;

    beforeAll(async () => {
        app = await createTestApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it("GET /config gives the SPA its Auth0 domain, client id and NEAR network", async () => {
        await request(app.getHttpServer())
            .get("/api/console/config")
            .expect(200, { auth0Domain: "login.console.test", auth0ClientId: "test-console-client-id", nearNetwork: "testnet" });
    });
});
