import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { register } from "prom-client";
import { DataSource } from "typeorm";
import { Dapp, DappChange } from "@database/console/entities";
import { createDapp, createDappChange } from "@database/console/test/factories";
import { DappChangeStatus, DappStatus, MauBracket } from "@shared/modules/dapp";
import { DappModule } from "../../../src/modules/dapp/dapp.module";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { adminBearer, bearer, testKeySet } from "../../mocks/auth/token.mock";
import { ADMIN_EMAIL, testConfig } from "../../mocks/config/config.mock";
import { dappForm, findChanges, findDapp, transitionCounts } from "../../mocks/dapp/dapp.mock";
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
        register.resetMetrics();
        provisioner.reset();
        slack.clearMocks();
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
     * Stores an approved dApp.
     * @param overrides Fields to change.
     * @returns The dApp.
     */
    const approvedDapp = (overrides: Partial<Dapp> = {}): Promise<Dapp> =>
        pendingDapp({ status: DappStatus.APPROVED, auth0ClientId: "client_live", ...overrides });

    /**
     * Sends a PATCH to the dApp as the owner.
     * @param id The dApp id.
     * @param body The fields to change.
     * @returns The pending request.
     */
    const patch = (id: string, body: Record<string, unknown>) =>
        testApp.request.patch(`/dapp/${id}`).set("Authorization", owner).send(body);

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
                reviewedAt: null,
                pendingChange: null,
                createdAt: expect.any(String),
            });
            expect(await findDapp(dataSource.manager, body.id)).toMatchObject({
                ownerEmail,
                status: "pending",
                reviewedAt: null,
            });
            expect(slack.notify).toHaveBeenCalledWith({ kind: "dapp_submitted", dapp: expect.objectContaining({ id: body.id }) });
            expect(provisioner.calls).toEqual([]);
            expect(await transitionCounts()).toEqual({ "create success": 1 });
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

        it("should list each dApp with its own pending change", async () => {
            const changed = await approvedDapp({ ownerEmail: "changed@owners.test", createdAt: new Date("2026-01-01T00:00:00Z") });
            const pending = await createDappChange(dataSource.manager, { dappId: changed.id });
            await createDappChange(dataSource.manager, { dappId: changed.id, status: DappChangeStatus.APPROVED, reviewedAt: new Date() });
            await pendingDapp({ ownerEmail: "pending@owners.test", createdAt: new Date("2026-01-02T00:00:00Z") });

            const { body } = await testApp.request.get("/dapp").set("Authorization", admin).expect(200);

            expect(
                body.items.map((item: { ownerEmail: string; pendingChange: { id: string } | null }) => [
                    item.ownerEmail,
                    item.pendingChange?.id ?? null,
                ]),
            ).toEqual([
                ["changed@owners.test", pending.id],
                ["pending@owners.test", null],
            ]);
        });

        it.each([
            "page=0",
            "pageSize=0",
            "pageSize=101",
            "needsReview=true",
            "status=pending",
            "search=acme",
            "orderBy=name",
            "order=DESC",
        ])("should refuse %s with 400", async (query) => {
            await testApp.request.get(`/dapp?${query}`).set("Authorization", admin).expect(400);
        });

        it("should answer a user only their own dApp as a list of one, matching the email in any case", async () => {
            const own = await pendingDapp();
            await pendingDapp({ ownerEmail: "other@owners.test" });

            const { body } = await testApp.request
                .get("/dapp")
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
                        reviewedAt: null,
                        pendingChange: null,
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
                reviewedAt: "2026-01-05T00:00:00.000Z",
                pendingChange: null,
                createdAt: dapp.createdAt.toISOString(),
            });
        });

        it("should answer the owner their own dApp with its pending change, matching the email in any case", async () => {
            const dapp = await approvedDapp();
            const change = await createDappChange(dataSource.manager, { dappId: dapp.id });

            const { body } = await testApp.request
                .get(`/dapp/${dapp.id}`)
                .set("Authorization", await bearer("BOB@Owners.TEST"))
                .expect(200);

            expect(body).toMatchObject({
                id: dapp.id,
                ownerEmail,
                pendingChange: expect.objectContaining({ id: change.id, name: "Acme Pay" }),
            });
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

    describe("PATCH /dapp/:id", () => {
        it("should edit a pending dApp in place, record no change and alert nobody", async () => {
            const dapp = await createDapp(dataSource.manager, { ...dappForm(), ownerEmail });

            const { body } = await patch(dapp.id, { name: "Acme Pay", contactEmail: "ops@acme.xyz" }).expect(200);

            expect(body).toMatchObject({ name: "Acme Pay", contactEmail: "ops@acme.xyz", status: "pending", pendingChange: null });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Pay", contactEmail: "ops@acme.xyz" });
            expect(await dataSource.manager.count(DappChange)).toBe(0);
            expect(slack.notify).not.toHaveBeenCalled();
        });

        it("should record an approved dApp's edit as a pending change of only the changed fields, keep the live values and alert the admins", async () => {
            const dapp = await approvedDapp();

            const { body } = await patch(dapp.id, {
                name: "Acme Pay",
                description: dappForm().description,
                mauBracket: MauBracket.GT_25K,
            }).expect(200);

            expect(body).toMatchObject({ name: "Acme Wallet", mauBracket: "lt1k", status: "approved" });
            expect(body.pendingChange).toEqual({
                id: expect.any(String),
                name: "Acme Pay",
                description: null,
                logoUrl: null,
                mauBracket: "gt25k",
                callbackUrls: null,
                logoutUrls: null,
                webOrigins: null,
                contactEmail: null,
                createdAt: expect.any(String),
            });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Wallet", mauBracket: "lt1k" });
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([
                expect.objectContaining({ status: "pending", reviewedAt: null, name: "Acme Pay", mauBracket: "gt25k", description: null }),
            ]);
            expect(slack.notify).toHaveBeenCalledWith({
                kind: "change_requested",
                dapp: expect.objectContaining({ id: dapp.id }),
                change: { name: "Acme Pay", mauBracket: "gt25k" },
            });
            expect(provisioner.calls).toEqual([]);
            expect(await transitionCounts()).toEqual({ "update success": 1 });
        });

        it("should replace the pending change with the new edit and keep the reviewed ones", async () => {
            const dapp = await approvedDapp();
            const reviewed = await createDappChange(dataSource.manager, {
                dappId: dapp.id,
                status: DappChangeStatus.REJECTED,
                reviewedAt: new Date(),
            });
            const first = (await patch(dapp.id, { name: "Acme Pay" }).expect(200)).body.pendingChange;

            const { body } = await patch(dapp.id, { contactEmail: "ops@acme.xyz" }).expect(200);

            expect(body.pendingChange).toEqual(expect.objectContaining({ name: null, contactEmail: "ops@acme.xyz" }));
            expect(body.pendingChange.id).not.toBe(first.id);
            expect((await dataSource.manager.find(DappChange, { order: { createdAt: "ASC" } })).map((change) => change.id)).toEqual([
                reviewed.id,
                body.pendingChange.id,
            ]);
            expect(slack.notify).toHaveBeenCalledTimes(2);
        });

        it("should answer only the pending change", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, { dappId: dapp.id, status: DappChangeStatus.APPROVED, reviewedAt: new Date() });
            const pending = await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Next" });

            const { body } = await patch(dapp.id, {}).expect(200);

            expect(body.pendingChange).toEqual(expect.objectContaining({ id: pending.id, name: "Acme Next" }));
        });

        it("should record nothing and alert nobody for an edit equal to the live values, lists compared as sets", async () => {
            const dapp = await approvedDapp({ callbackUrls: ["https://acme.xyz/callback", "https://acme.xyz/silent"] });

            const { body } = await patch(dapp.id, {
                name: "Acme Wallet",
                callbackUrls: ["https://acme.xyz/silent", "https://ACME.xyz/callback"],
            }).expect(200);

            expect(body).toMatchObject({ id: dapp.id, pendingChange: null });
            expect(await dataSource.manager.count(DappChange)).toBe(0);
            expect(slack.notify).not.toHaveBeenCalled();
        });

        it("should answer 404 DAPP_NOT_FOUND for another owner's dApp and for an unknown id, and change nothing", async () => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail });
            const stranger = await bearer("stranger@owners.test");

            const { body } = await testApp.request
                .patch(`/dapp/${dapp.id}`)
                .set("Authorization", stranger)
                .send({ name: "Hijacked" })
                .expect(404);
            await patch("00000000-0000-4000-8000-000000000000", { name: "Ghost" }).expect(404);

            expect(body).toEqual({ statusCode: 404, message: "DAPP_NOT_FOUND" });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: dapp.name });
        });

        it("should find the owner's dApp by email in any case", async () => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail });

            await testApp.request
                .patch(`/dapp/${dapp.id}`)
                .set("Authorization", await bearer("BOB@Owners.TEST"))
                .send({ name: "Acme Pay" })
                .expect(200);
        });

        it("should answer 409 INVALID_TRANSITION for a rejected dApp", async () => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail, status: DappStatus.REJECTED });

            const { body } = await patch(dapp.id, { name: "Acme Pay" }).expect(409);

            expect(body).toEqual({ statusCode: 409, message: "INVALID_TRANSITION" });
        });

        it.each<[string, Record<string, unknown>]>([
            ["a null field", { name: null }],
            ["an invalid field", { webOrigins: ["https://acme.xyz/app"] }],
            ["an unknown field", { status: "approved" }],
        ])("should refuse %s with 400 and change nothing", async (_case, body) => {
            const dapp = await approvedDapp();

            await patch(dapp.id, body).expect(400);

            expect(await dataSource.manager.count(DappChange)).toBe(0);
        });

        it("should answer 400 for an id that is not a uuid", async () => {
            await patch("not-a-uuid", { name: "Acme Pay" }).expect(400);
        });
    });
});
