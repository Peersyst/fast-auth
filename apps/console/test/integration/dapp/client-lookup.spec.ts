import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Dapp } from "@database/console/entities";
import { createDapp, createDappChange } from "@database/console/test/factories";
import { DappStatus } from "@shared/modules/dapp";
import { corsOptions } from "../../../src/cors";
import { DappModule } from "../../../src/modules/dapp/dapp.module";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { testKeySet } from "../../mocks/auth/token.mock";
import { testConfig } from "../../mocks/config/config.mock";
import { dappForm } from "../../mocks/dapp/dapp.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";

describe("GET /dapp/client (integration)", () => {
    let testApp: TestApp;
    let dataSource: DataSource;
    let owners = 0;

    beforeAll(async () => {
        testApp = await createTestApp({
            imports: [
                ConfigModule.forRoot({ load: [testConfig], isGlobal: true }),
                TypeOrmModule.forRoot(testConfig().database),
                DappModule,
            ],
            overrides: [
                { provide: JWT_KEY_SET, useValue: await testKeySet() },
                { provide: SLACK_NOTIFIER, useValue: new SlackNotifierMock() },
                { provide: AUTH0_PROVISIONER, useValue: new FakeProvisionerMock() },
            ],
            configure: (app) => app.enableCors(corsOptions(testConfig().server.publicUrl)),
        });
        dataSource = testApp.module.get(DataSource);
    });

    afterAll(async () => {
        await closeTestApp(testApp.app);
    });

    beforeEach(async () => {
        await truncateAll(dataSource);
    });

    /**
     * Stores an approved dApp with a client. Each call gets its own owner, since an owner may have one live dApp.
     * @param overrides Fields to change.
     * @returns The dApp.
     */
    const approvedDapp = (overrides: Partial<Dapp> = {}): Promise<Dapp> =>
        createDapp(dataSource.manager, {
            ...dappForm(),
            ownerEmail: `owner${owners++}@owners.test`,
            status: DappStatus.APPROVED,
            auth0ClientId: "client_acme",
            ...overrides,
        });

    /**
     * Calls the lookup with no credentials.
     * @param origin The query value, left unencoded when it is a string and absent when undefined.
     * @returns The pending request.
     */
    const lookup = (origin?: string) => testApp.request.get("/dapp/client").query(origin === undefined ? {} : { origin });

    it("should answer the client of an approved dApp that lists the origin", async () => {
        await approvedDapp({ webOrigins: ["https://other.xyz", "https://acme.xyz:8443"] });

        const { body } = await lookup("https://acme.xyz:8443").expect(200);

        expect(body).toEqual({ clientId: "client_acme" });
    });

    it("should match the way the web origins are stored, with the scheme and host in lowercase and surrounding spaces trimmed", async () => {
        await approvedDapp();

        const upper = await lookup("HTTPS://ACME.XYZ").expect(200);
        const spaced = await lookup(" https://acme.xyz ").expect(200);

        expect(upper.body).toEqual({ clientId: "client_acme" });
        expect(spaced.body).toEqual({ clientId: "client_acme" });
    });

    it("should answer the oldest dApp's client when several list the origin", async () => {
        await approvedDapp({ auth0ClientId: "client_newer", createdAt: new Date("2026-03-01T00:00:00Z") });
        await approvedDapp({ auth0ClientId: "client_oldest", createdAt: new Date("2026-01-01T00:00:00Z") });
        await approvedDapp({ auth0ClientId: "client_middle", createdAt: new Date("2026-02-01T00:00:00Z") });

        const { body } = await lookup("https://acme.xyz").expect(200);

        expect(body).toEqual({ clientId: "client_oldest" });
    });

    it.each([DappStatus.PENDING, DappStatus.REJECTED, DappStatus.REMOVED])("should answer 404 for a %s dApp", async (status) => {
        await approvedDapp({ status });

        const { body } = await lookup("https://acme.xyz").expect(404);

        expect(body).toEqual({ statusCode: 404, message: "DAPP_NOT_FOUND" });
    });

    it("should answer 404 for an approved dApp that has no client yet", async () => {
        await approvedDapp({ auth0ClientId: null });

        await lookup("https://acme.xyz").expect(404);
    });

    it("should answer 404 for an origin no dApp lists, even when another dApp lists a path or subdomain of it", async () => {
        await approvedDapp({ webOrigins: ["https://acme.xyz"] });

        await lookup("https://unknown.xyz").expect(404);
        await lookup("https://app.acme.xyz").expect(404);
        await lookup("http://acme.xyz").expect(404);
    });

    it("should answer 404 for an origin that only a pending change lists", async () => {
        const dapp = await approvedDapp({ webOrigins: ["https://acme.xyz"] });
        await createDappChange(dataSource.manager, { dappId: dapp.id, webOrigins: ["https://changed.xyz"] });

        await lookup("https://changed.xyz").expect(404);
        const { body } = await lookup("https://acme.xyz").expect(200);
        expect(body).toEqual({ clientId: "client_acme" });
    });

    it("should answer 200 for an http origin that a dApp lists, as a local dev server is", async () => {
        await approvedDapp({ webOrigins: ["http://localhost:3000"] });

        const { body } = await lookup("http://localhost:3000").expect(200);

        expect(body).toEqual({ clientId: "client_acme" });
    });

    it.each(["acme.xyz", "https://acme.xyz/", "https://acme.xyz/app", "https://acme.xyz:443", "null", "", "file:///tmp/a"])(
        "should answer 400 for the origin %j, which is not an origin",
        async (origin) => {
            await approvedDapp();

            const { body } = await lookup(origin).expect(400);

            expect(body).toMatchObject({ statusCode: 400, error: "Bad Request" });
        },
    );

    it("should answer 400 when the origin is missing or given twice", async () => {
        await lookup().expect(400);
        await testApp.request.get("/dapp/client?origin=https://acme.xyz&origin=https://acme.xyz").expect(400);
    });

    describe("CORS", () => {
        it("should allow every origin on a 200, so a sandboxed iframe can read it", async () => {
            await approvedDapp();

            const response = await lookup("https://acme.xyz").set("Origin", "null").expect(200);

            expect(response.headers["access-control-allow-origin"]).toBe("*");
        });

        it("should allow every origin on a 404 and a 400", async () => {
            const notFound = await lookup("https://acme.xyz").set("Origin", "null").expect(404);
            const invalid = await lookup().set("Origin", "null").expect(400);

            expect(notFound.headers["access-control-allow-origin"]).toBe("*");
            expect(invalid.headers["access-control-allow-origin"]).toBe("*");
        });

        it("should answer the preflight with every origin and the GET method", async () => {
            const response = await testApp.request
                .options("/dapp/client")
                .set("Origin", "null")
                .set("Access-Control-Request-Method", "GET")
                .set("Access-Control-Request-Headers", "content-type")
                .expect(204);

            expect(response.headers["access-control-allow-origin"]).toBe("*");
            expect(response.headers["access-control-allow-methods"]).toBe("GET");
            expect(response.headers["access-control-allow-headers"]).toBe("content-type");
        });

        it("should keep allowing only the web app on another route, whose preflight stays the same", async () => {
            const publicUrl = testConfig().server.publicUrl;

            const get = await testApp.request.get("/dapp").set("Origin", "null").expect(401);
            const preflight = await testApp.request
                .options("/dapp")
                .set("Origin", "null")
                .set("Access-Control-Request-Method", "POST")
                .expect(204);

            expect(get.headers["access-control-allow-origin"]).toBe(publicUrl);
            expect(preflight.headers["access-control-allow-origin"]).toBe(publicUrl);
        });

        it("should open only the lookup path itself, with or without a trailing slash", async () => {
            const slash = await testApp.request.get("/dapp/client/").query({ origin: "https://acme.xyz" }).set("Origin", "null");
            const lookalike = await testApp.request.get("/admin/dapp/client").set("Origin", "null");

            expect(slash.headers["access-control-allow-origin"]).toBe("*");
            expect(lookalike.headers["access-control-allow-origin"]).toBe(testConfig().server.publicUrl);
        });
    });

    it("should leave GET /dapp/:id behind its guard", async () => {
        const { body } = await testApp.request.get("/dapp/6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b").expect(401);

        expect(body).toMatchObject({ statusCode: 401 });
    });
});
