import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { register } from "prom-client";
import { DataSource } from "typeorm";
import { Dapp } from "@database/console/entities";
import { createDapp } from "@database/console/test/factories";
import { DappStatus } from "@shared/modules/dapp";
import { DappModule } from "../../../src/modules/dapp/dapp.module";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { adminBearer, bearer, testKeySet } from "../../mocks/auth/token.mock";
import { ADMIN_EMAIL, testConfig } from "../../mocks/config/config.mock";
import { dappForm, findDapp, transitionCounts } from "../../mocks/dapp/dapp.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";

describe("DappModule (integration)", () => {
    const ownerEmail = "bob@owners.test";
    const provisioner = new FakeProvisionerMock();
    const slack = new SlackNotifierMock();
    let testApp: TestApp;
    let dataSource: DataSource;
    let owner: string;
    let admin: string;

    beforeAll(async () => {
        testApp = await createTestApp({
            imports: [
                ConfigModule.forRoot({ load: [testConfig], isGlobal: true }),
                TypeOrmModule.forRoot(testConfig().database),
                DappModule,
            ],
            overrides: [
                { provide: JWT_KEY_SET, useValue: await testKeySet() },
                { provide: SLACK_NOTIFIER, useValue: slack },
                { provide: AUTH0_PROVISIONER, useValue: provisioner },
            ],
        });
        dataSource = testApp.module.get(DataSource);
    });

    afterAll(async () => {
        await closeTestApp(testApp.app);
    });

    beforeEach(async () => {
        await truncateAll(dataSource);
        provisioner.reset();
        slack.clearMocks();
        register.resetMetrics();
        owner = await bearer(ownerEmail);
        admin = await adminBearer();
    });

    /**
     * Stores a pending dApp.
     * @param overrides Fields to change.
     * @returns The dApp.
     */
    const pendingDapp = (overrides: Partial<Dapp> = {}): Promise<Dapp> =>
        createDapp(dataSource.manager, { ...dappForm(), ownerEmail, ...overrides });

    /**
     * Lists dApps as the admin and keeps one column of each item.
     * @param query The query string.
     * @param column The column to keep.
     * @returns The column's values, in the order listed.
     */
    const adminList = async (query: string, column: keyof Dapp = "ownerEmail"): Promise<unknown[]> => {
        const { body } = await testApp.request.get(`/dapp?${query}`).set("Authorization", admin).expect(200);
        return body.items.map((item: Record<string, unknown>) => item[column]);
    };

    describe("POST /dapp", () => {
        it("should store a pending dApp, alert the admins on Slack, and call no Auth0", async () => {
            const { body } = await testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()).expect(201);

            expect(body).toEqual({
                id: expect.any(String),
                ownerEmail,
                ...dappForm(),
                status: "pending",
                auth0ClientId: null,
                auth0Error: null,
                reviewedAt: null,
                createdAt: expect.any(String),
            });
            expect(await findDapp(dataSource.manager, body.id)).toMatchObject({
                ownerEmail,
                status: "pending",
                auth0Error: null,
                reviewedAt: null,
            });
            expect(slack.notify).toHaveBeenCalledWith({ kind: "dapp_submitted", dapp: expect.objectContaining({ id: body.id }) });
            expect(provisioner.calls).toEqual([]);
        });

        it("should store the normalised values", async () => {
            const form = dappForm({
                name: "  Acme  ",
                logoUrl: " HTTPS://CDN.Acme.xyz/Logo.png ",
                callbackUrls: ["https://ACME.xyz/callback", "https://acme.xyz/callback"],
                contactEmail: " dev@acme.xyz ",
            });

            const { body } = await testApp.request.post("/dapp").set("Authorization", owner).send(form).expect(201);

            expect(body).toMatchObject({
                name: "Acme",
                logoUrl: "https://cdn.acme.xyz/Logo.png",
                callbackUrls: ["https://acme.xyz/callback"],
                contactEmail: "dev@acme.xyz",
            });
        });

        it("should still answer 201 when the Slack alert fails", async () => {
            slack.notify.mockRejectedValueOnce(new Error("Slack is down"));

            const { body } = await testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()).expect(201);

            expect(await findDapp(dataSource.manager, body.id)).toMatchObject({ status: "pending" });
        });

        it("should answer 409 DAPP_ALREADY_EXISTS for a second live dApp of one email, in any case", async () => {
            await testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()).expect(201);

            const { body } = await testApp.request
                .post("/dapp")
                .set("Authorization", await bearer("BOB@owners.test"))
                .send(dappForm())
                .expect(409);

            expect(body).toEqual({ statusCode: 409, message: "DAPP_ALREADY_EXISTS" });
        });

        it("should count each create under its result", async () => {
            await testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()).expect(201);
            await testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()).expect(409);

            expect(await transitionCounts()).toEqual({ "create success": 1, "create DAPP_ALREADY_EXISTS": 1 });
        });

        it("should give one 201 and one 409 for two concurrent submissions of one email", async () => {
            const responses = await Promise.all([
                testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()),
                testApp.request
                    .post("/dapp")
                    .set("Authorization", owner)
                    .send(dappForm({ name: "Acme Twin" })),
            ]);

            expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
            expect(await dataSource.manager.count(Dapp)).toBe(1);
        });

        it.each<[string, Record<string, unknown>]>([
            ["an http callback URL", { callbackUrls: ["http://acme.xyz/callback"] }],
            ["an IP logout URL", { logoutUrls: ["https://127.0.0.1/"] }],
            ["a web origin with a path", { webOrigins: ["https://acme.xyz/app"] }],
            ["a name with angle brackets", { name: "<b>Acme</b>" }],
            ["a NUL in the description", { description: "A\u0000wallet" }],
            ["a 141-character description", { description: "a".repeat(141) }],
            ["an invalid contact email", { contactEmail: "not-an-email" }],
            ["an unknown MAU bracket", { mauBracket: "huge" }],
            ["an unknown field", { ownerEmail: "someone@else.test" }],
            ["a missing field", { name: undefined }],
        ])("should refuse %s with 400 and store nothing", async (_case, overrides) => {
            await testApp.request
                .post("/dapp")
                .set("Authorization", owner)
                .send({ ...dappForm(), ...overrides })
                .expect(400);

            expect(await dataSource.manager.count(Dapp)).toBe(0);
        });
    });

    describe("GET /dapp", () => {
        it("should page every dApp for an admin by creation time with the total", async () => {
            const first = await pendingDapp({ ownerEmail: "a@owners.test", createdAt: new Date("2026-01-01T00:00:00Z") });
            const second = await pendingDapp({ ownerEmail: "b@owners.test", createdAt: new Date("2026-01-02T00:00:00Z") });
            await pendingDapp({ ownerEmail: "c@owners.test", createdAt: new Date("2026-01-03T00:00:00Z") });

            const { body } = await testApp.request.get("/dapp?page=1&pageSize=2").set("Authorization", admin).expect(200);

            expect(body).toMatchObject({ totalItems: 3, currentPage: 1, pages: 2 });
            expect(body.items).toEqual([
                expect.objectContaining({ id: first.id, ownerEmail: "a@owners.test", status: "pending" }),
                expect.objectContaining({ id: second.id, ownerEmail: "b@owners.test" }),
            ]);
            expect(await adminList("page=2&pageSize=2")).toEqual(["c@owners.test"]);
        });

        it("should list only the pending dApps for review, oldest first", async () => {
            await pendingDapp({ ownerEmail: "late@owners.test", createdAt: new Date("2026-01-02T00:00:00Z") });
            await pendingDapp({ ownerEmail: "early@owners.test", createdAt: new Date("2026-01-01T00:00:00Z") });
            await pendingDapp({ ownerEmail: "approved@owners.test", status: DappStatus.APPROVED, auth0ClientId: "client_live" });
            await pendingDapp({ ownerEmail: "rejected@owners.test", status: DappStatus.REJECTED });

            expect(await adminList("needsReview=true")).toEqual(["early@owners.test", "late@owners.test"]);
        });

        it("should narrow the review queue by status instead of replacing it", async () => {
            await pendingDapp({ ownerEmail: "pending@owners.test" });
            await pendingDapp({ ownerEmail: "rejected@owners.test", status: DappStatus.REJECTED });

            expect(await adminList("needsReview=true&status=pending")).toEqual(["pending@owners.test"]);
            expect(await adminList("needsReview=true&status=rejected")).toEqual([]);
            expect(await adminList("status=rejected")).toEqual(["rejected@owners.test"]);
        });

        it("should search case-insensitively with LIKE wildcards taken literally", async () => {
            await pendingDapp({ ownerEmail: "a@owners.test", name: "Acme 100% Wallet" });
            await pendingDapp({ ownerEmail: "b@owners.test", name: "Acme 100 Wallet" });
            await pendingDapp({ ownerEmail: "c@owners.test", name: "Acme_Pay" });
            await pendingDapp({ ownerEmail: "d@owners.test", name: "AcmeXPay" });

            expect(await adminList("search=100%25")).toEqual(["a@owners.test"]);
            expect(await adminList("search=acme_pay")).toEqual(["c@owners.test"]);
        });

        it("should search the owner email, the contact email and the Auth0 client id, within the status filter", async () => {
            await pendingDapp({ ownerEmail: "owner-match@owners.test" });
            await pendingDapp({ ownerEmail: "b@owners.test", contactEmail: "ops@match.xyz" });
            await pendingDapp({ ownerEmail: "c@owners.test", status: DappStatus.APPROVED, auth0ClientId: "client_MATCH" });
            await pendingDapp({ ownerEmail: "d@owners.test", status: DappStatus.REJECTED, contactEmail: "dev@match.xyz" });
            await pendingDapp({ ownerEmail: "e@owners.test" });

            expect(await adminList("search=match&orderBy=name")).toHaveLength(4);
            expect(await adminList("search=MATCH&status=approved")).toEqual(["c@owners.test"]);
        });

        it("should sort by the requested column and order", async () => {
            await pendingDapp({ ownerEmail: "a@owners.test", name: "Alpha" });
            await pendingDapp({ ownerEmail: "b@owners.test", name: "Zulu" });

            expect(await adminList("orderBy=name&order=DESC", "name")).toEqual(["Zulu", "Alpha"]);
            expect(await adminList("orderBy=name&order=ASC", "name")).toEqual(["Alpha", "Zulu"]);
        });

        it.each(["page=0", "pageSize=101", "status=gone", "orderBy=owner", "search=acme%00", "order=desc", "needsReview=yes"])(
            "should refuse %s with 400",
            async (query) => {
                await testApp.request.get(`/dapp?${query}`).set("Authorization", admin).expect(400);
            },
        );

        it("should answer a user only their own live dApp as a list of one, ignoring the filters", async () => {
            const own = await pendingDapp();
            await pendingDapp({ ownerEmail: "other@owners.test" });

            const { body } = await testApp.request
                .get("/dapp?status=rejected&needsReview=true&page=3&pageSize=1&search=other")
                .set("Authorization", await bearer("BOB@owners.test"))
                .expect(200);

            expect(body).toEqual({
                items: [
                    {
                        id: own.id,
                        ownerEmail,
                        ...dappForm(),
                        status: "pending",
                        auth0ClientId: null,
                        auth0Error: null,
                        reviewedAt: null,
                        createdAt: own.createdAt.toISOString(),
                    },
                ],
                totalItems: 1,
                currentPage: 1,
                pages: 1,
            });
        });

        it("should answer a user without a dApp an empty list", async () => {
            await pendingDapp({ ownerEmail: "other@owners.test" });

            const { body } = await testApp.request.get("/dapp").set("Authorization", owner).expect(200);

            expect(body).toEqual({ items: [], totalItems: 0, currentPage: 1, pages: 0 });
        });

        it("should answer 401 UNAUTHENTICATED without a token", async () => {
            const { body } = await testApp.request.get("/dapp").expect(401);

            expect(body).toEqual({ statusCode: 401, message: "UNAUTHENTICATED" });
        });

        it("should answer 403 EMAIL_NOT_VERIFIED to an unverified email, an admin's included", async () => {
            for (const email of [ownerEmail, ADMIN_EMAIL]) {
                const { body } = await testApp.request
                    .get("/dapp")
                    .set("Authorization", await bearer(email, false))
                    .expect(403);

                expect(body).toEqual({ statusCode: 403, message: "EMAIL_NOT_VERIFIED" });
            }
        });
    });

    describe("GET /dapp/:id", () => {
        it("should answer an admin any dApp", async () => {
            const dapp = await pendingDapp({ status: DappStatus.REJECTED, reviewedAt: new Date("2026-01-05T00:00:00Z") });

            const { body } = await testApp.request.get(`/dapp/${dapp.id}`).set("Authorization", admin).expect(200);

            expect(body).toEqual({
                id: dapp.id,
                ownerEmail,
                ...dappForm(),
                status: "rejected",
                auth0ClientId: null,
                auth0Error: null,
                reviewedAt: "2026-01-05T00:00:00.000Z",
                createdAt: dapp.createdAt.toISOString(),
            });
        });

        it("should answer the owner their own dApp, matching the email in any case", async () => {
            const dapp = await pendingDapp();

            const { body } = await testApp.request
                .get(`/dapp/${dapp.id}`)
                .set("Authorization", await bearer("BOB@Owners.TEST"))
                .expect(200);

            expect(body).toMatchObject({ id: dapp.id, ownerEmail });
        });

        it("should answer 404 DAPP_NOT_FOUND for another owner's dApp and for an unknown id", async () => {
            const dapp = await pendingDapp();
            const stranger = await bearer("stranger@owners.test");

            const { body } = await testApp.request.get(`/dapp/${dapp.id}`).set("Authorization", stranger).expect(404);
            const unknown = await testApp.request.get("/dapp/00000000-0000-4000-8000-000000000000").set("Authorization", admin).expect(404);

            expect(body).toEqual({ statusCode: 404, message: "DAPP_NOT_FOUND" });
            expect(unknown.body).toEqual({ statusCode: 404, message: "DAPP_NOT_FOUND" });
        });

        it("should answer 400 for an id that is not a uuid", async () => {
            await testApp.request.get("/dapp/not-a-uuid").set("Authorization", admin).expect(400);
        });
    });
});
