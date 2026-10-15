import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { loadConfig } from "../src/config";
import { configureApp } from "../src/configure-app";
import { expectError } from "./utils/console-api";
import { createTestApp } from "./utils/test-app";

const INDEX_HTML = "<!doctype html><title>NEAR Auth Console</title>";

describe("SPA serving", () => {
    let publicDir: string;
    let app: NestExpressApplication;

    beforeAll(async () => {
        publicDir = mkdtempSync(join(tmpdir(), "console-spa-"));
        writeFileSync(join(publicDir, "index.html"), INDEX_HTML);
        mkdirSync(join(publicDir, "assets"));
        writeFileSync(join(publicDir, "assets", "app.js"), "console.log('app');");
        app = await createTestApp(publicDir);
    });

    afterAll(async () => {
        await app.close();
        rmSync(publicDir, { recursive: true, force: true });
    });

    it("serves index.html for a route outside the API, with no token", async () => {
        const response = await request(app.getHttpServer()).get("/some/deep/route");

        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/^text\/html/);
        expect(response.text).toBe(INDEX_HTML);
    });

    it("serves a built file as itself, not as index.html", async () => {
        const response = await request(app.getHttpServer()).get("/assets/app.js");

        expect(response.status).toBe(200);
        expect(response.text).toBe("console.log('app');");
    });

    it("lets browsers cache a hashed asset for good, but revalidates index.html", async () => {
        const asset = await request(app.getHttpServer()).get("/assets/app.js");
        const index = await request(app.getHttpServer()).get("/");
        const fallback = await request(app.getHttpServer()).get("/some/deep/route");

        expect(asset.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
        expect(index.headers["cache-control"]).toBe("public, max-age=0");
        expect(fallback.headers["cache-control"]).toBe("public, max-age=0");
    });

    it("answers a missing file with the JSON 404, not index.html", async () => {
        const response = await request(app.getHttpServer()).get("/assets/index-OLDHASH.js");

        expectError(response, 404, "NOT_FOUND");
        expect(response.headers["content-type"]).toMatch(/^application\/json/);
    });

    it("answers an unknown API route with the JSON 404 NOT_FOUND, not index.html", async () => {
        const response = await request(app.getHttpServer()).get("/api/console/unknown");

        expectError(response, 404, "NOT_FOUND");
        expect(response.headers["content-type"]).toMatch(/^application\/json/);
    });

    it("refuses to boot in staging without the SPA build, since no SPA would be served", async () => {
        const config = loadConfig();
        const bare = (await Test.createTestingModule({}).compile()).createNestApplication<NestExpressApplication>();

        try {
            expect(() =>
                configureApp(bare, { ...config, server: { ...config.server, env: "staging" } }, join(publicDir, "missing")),
            ).toThrow(/SPA build/);
        } finally {
            await bare.close();
        }
    });
});
