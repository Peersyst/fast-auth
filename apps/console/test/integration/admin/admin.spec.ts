import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Dapp, DappEvent } from "@database/console/entities";
import { createDapp } from "@database/console/test/factories";
import { DappEventType, DappStatus, syncedFieldsOf } from "@shared/modules/dapp";
import { AdminModule } from "../../../src/modules/admin/admin.module";
import { DappWriteService } from "../../../src/modules/dapp/dapp-write.service";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { adminBearer, bearer, testKeySet } from "../../mocks/auth/token.mock";
import { ADMIN_EMAIL, testConfig } from "../../mocks/config/config.mock";
import { dappForm, eventTypes, findDapp } from "../../mocks/dapp/dapp.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";

const OWNER = "bob@owners.test";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

describe("AdminModule (integration)", () => {
    const provisioner = new FakeProvisionerMock();
    const slack = new SlackNotifierMock();
    let testApp: TestApp;
    let dataSource: DataSource;
    let admin: string;

    beforeAll(async () => {
        testApp = await createTestApp({
            imports: [
                ConfigModule.forRoot({ load: [testConfig], isGlobal: true }),
                TypeOrmModule.forRoot(testConfig().database),
                AdminModule,
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
        admin = await adminBearer();
    });

    /**
     * Stores a pending dApp for the owner.
     * @param overrides Fields to change.
     * @returns The dApp.
     */
    const pendingDapp = (overrides: Partial<Dapp> = {}): Promise<Dapp> =>
        createDapp(dataSource.manager, { ...dappForm(), ownerEmail: OWNER, ...overrides });

    /**
     * Stores an approved dApp whose Auth0 client exists in the fake provisioner.
     * @param overrides Fields to change.
     * @returns The dApp.
     */
    const approvedDapp = async (overrides: Partial<Dapp> = {}): Promise<Dapp> => {
        const dapp = await pendingDapp({ status: DappStatus.APPROVED, auth0ClientId: "client_live", ...overrides });
        provisioner.clients.set("client_live", { dappId: dapp.id, input: syncedFieldsOf(dapp) });
        return dapp;
    };

    /**
     * Posts an admin action.
     * @param path The path under /admin/dapps.
     * @param body The request body.
     * @returns The request.
     */
    const post = (path: string, body: object) => testApp.request.post(`/admin/dapps/${path}`).set("Authorization", admin).send(body);

    describe("GET /admin/dapps", () => {
        it("should page every dApp by submission time with the total", async () => {
            const first = await pendingDapp({ ownerEmail: "a@owners.test", submittedAt: new Date("2026-01-01T00:00:00Z") });
            const second = await pendingDapp({ ownerEmail: "b@owners.test", submittedAt: new Date("2026-01-02T00:00:00Z") });
            await pendingDapp({ ownerEmail: "c@owners.test", submittedAt: new Date("2026-01-03T00:00:00Z") });

            const { body } = await testApp.request.get("/admin/dapps?page=1&pageSize=2").set("Authorization", admin).expect(200);

            expect(body).toMatchObject({ totalItems: 3, currentPage: 1, pages: 2 });
            expect(body.items.map((item: { id: string }) => item.id)).toEqual([first.id, second.id]);
            expect(body.items[0]).toMatchObject({ ownerEmail: "a@owners.test", auth0Error: null });
        });

        it("should list only dApps needing review, oldest wait first, counting a change request from its request time", async () => {
            const changeRequested = await approvedDapp({
                ownerEmail: "a@owners.test",
                submittedAt: new Date("2025-01-01T00:00:00Z"),
                pendingChange: syncedFieldsOf(dappForm({ name: "Acme Pay" })),
                pendingChangeAt: new Date("2026-01-03T00:00:00Z"),
            });
            const pending = await pendingDapp({ ownerEmail: "b@owners.test", submittedAt: new Date("2026-01-02T00:00:00Z") });
            await approvedDapp({ ownerEmail: "c@owners.test" });
            await pendingDapp({ ownerEmail: "d@owners.test", status: DappStatus.REJECTED });

            const { body } = await testApp.request.get("/admin/dapps?needsReview=true").set("Authorization", admin).expect(200);

            expect(body.items.map((item: { id: string }) => item.id)).toEqual([pending.id, changeRequested.id]);
        });

        it("should narrow the review queue by status instead of replacing it", async () => {
            await createDapp(dataSource.manager, { ownerEmail: "pending@owners.test", status: DappStatus.PENDING });
            await createDapp(dataSource.manager, { ownerEmail: "rejected@owners.test", status: DappStatus.REJECTED });
            const list = async (query: string): Promise<string[]> => {
                const { body } = await testApp.request.get(`/admin/dapps?${query}`).set("Authorization", admin).expect(200);
                return body.items.map((item: { ownerEmail: string }) => item.ownerEmail);
            };

            expect(await list("needsReview=true&status=pending")).toEqual(["pending@owners.test"]);
            expect(await list("needsReview=true&status=rejected")).toEqual([]);
        });

        it("should filter by status and search case-insensitively with LIKE wildcards taken literally", async () => {
            const match = await pendingDapp({ ownerEmail: "a@owners.test", name: "Acme 100% Wallet" });
            await pendingDapp({ ownerEmail: "b@owners.test", name: "Acme 100 Wallet" });

            const { body } = await testApp.request.get("/admin/dapps?status=pending&search=100%25").set("Authorization", admin).expect(200);

            expect(body.items.map((item: { id: string }) => item.id)).toEqual([match.id]);
        });

        it("should sort by the requested column and order", async () => {
            await pendingDapp({ ownerEmail: "a@owners.test", name: "Alpha" });
            await pendingDapp({ ownerEmail: "b@owners.test", name: "Zulu" });

            const { body } = await testApp.request.get("/admin/dapps?orderBy=name&order=DESC").set("Authorization", admin).expect(200);

            expect(body.items.map((item: { name: string }) => item.name)).toEqual(["Zulu", "Alpha"]);
        });

        it.each(["page=0", "pageSize=101", "status=gone", "orderBy=owner", "search=acme%00", "order=desc"])(
            "should refuse %s with 400",
            async (query) => {
                await testApp.request.get(`/admin/dapps?${query}`).set("Authorization", admin).expect(400);
            },
        );
    });

    describe("GET /admin/dapps/:id", () => {
        it("should answer the admin view of a dApp in any status", async () => {
            const dapp = await pendingDapp({ status: DappStatus.REMOVED });

            const { body } = await testApp.request.get(`/admin/dapps/${dapp.id}`).set("Authorization", admin).expect(200);

            expect(body).toMatchObject({
                id: dapp.id,
                status: "removed",
                ownerEmail: OWNER,
            });
        });

        it("should answer 404 DAPP_NOT_FOUND for an unknown id and 400 for an id that is not a uuid", async () => {
            const { body } = await testApp.request.get(`/admin/dapps/${UNKNOWN_ID}`).set("Authorization", admin).expect(404);

            expect(body).toEqual({ statusCode: 404, message: "DAPP_NOT_FOUND" });
            await testApp.request.get("/admin/dapps/not-a-uuid").set("Authorization", admin).expect(400);
        });
    });

    describe("POST /admin/dapps/:id/approve", () => {
        it("should create the Auth0 client from the synced fields, approve the dApp, and notify nobody", async () => {
            const dapp = await pendingDapp();

            const { body } = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(200);

            expect(body).toMatchObject({
                status: "approved",
                auth0ClientId: expect.stringMatching(/^fake_/),
                version: 2,
            });
            expect(provisioner.calls).toEqual([
                { op: "findClient", dappId: dapp.id },
                { op: "createClient", dappId: dapp.id, input: syncedFieldsOf(dapp) },
            ]);
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["approved", "auth0_created"]);
            expect(slack.notify).not.toHaveBeenCalled();
        });

        it("should reuse the client already tagged with the dApp instead of creating another", async () => {
            const dapp = await pendingDapp();
            provisioner.clients.set("client_orphan", { dappId: dapp.id, input: syncedFieldsOf(dapp) });

            const { body } = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(200);

            expect(body.auth0ClientId).toBe("client_orphan");
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["approved", "auth0_updated"]);
        });

        it("should answer 502 PROVISIONING_FAILED, keep the dApp pending at its version, and let a retry at that version approve it", async () => {
            const dapp = await pendingDapp();
            provisioner.script("createClient", "failed");

            const { body } = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(502);

            expect(body.message).toBe("PROVISIONING_FAILED");
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "pending",
                version: 1,
                updatedAt: dapp.updatedAt,
                auth0Error: "Fake createClient: scripted failed",
            });
            const retried = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(200);
            expect(retried.body).toMatchObject({ status: "approved", auth0Error: null });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["auth0_failed", "approved", "auth0_created"]);
        });

        it("should adopt on retry the client a timed-out create made instead of creating another", async () => {
            const dapp = await pendingDapp();
            provisioner.script("createClient", "timeout_after_success");

            expect((await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(502)).body.message).toBe("PROVISIONING_FAILED");
            const [orphan] = [...provisioner.clients.keys()];
            const { body } = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(200);

            expect(body).toMatchObject({ status: "approved", auth0ClientId: orphan });
            expect(provisioner.clients.size).toBe(1);
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["auth0_failed", "approved", "auth0_updated"]);
        });

        it("should answer 422 PROVISIONING_REJECTED when Auth0 refuses the client", async () => {
            const dapp = await pendingDapp();
            provisioner.script("createClient", "rejected");

            const { body } = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(422);

            expect(body.message).toBe("PROVISIONING_REJECTED");
        });

        it("should answer 409 DAPP_CHANGED for a stale version and call Auth0 for nothing", async () => {
            const dapp = await pendingDapp({ version: 3 });

            expect((await post(`${dapp.id}/approve`, { expectedVersion: 2 }).expect(409)).body.message).toBe("DAPP_CHANGED");
            expect(provisioner.calls).toEqual([]);
        });

        it("should answer 404 DAPP_NOT_FOUND for an unknown dApp", async () => {
            await post(`${UNKNOWN_ID}/approve`, { expectedVersion: 1 }).expect(404);
        });
    });

    describe("POST /admin/dapps/:id/reject", () => {
        it("should reject the dApp, delete any client tagged with it, and notify nobody", async () => {
            const dapp = await pendingDapp();
            provisioner.clients.set("client_orphan", { dappId: dapp.id, input: syncedFieldsOf(dapp) });

            const { body } = await post(`${dapp.id}/reject`, { expectedVersion: 1 }).expect(200);

            expect(body).toMatchObject({ status: "rejected" });
            expect(provisioner.clients.size).toBe(0);
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["rejected", "auth0_deleted"]);
            expect(slack.notify).not.toHaveBeenCalled();
        });
    });

    describe("POST /admin/dapps/:id/change/approve and change/reject", () => {
        const change = syncedFieldsOf(dappForm({ name: "Acme Pay", webOrigins: ["https://pay.acme.xyz"] }));

        it("should apply the pending change to the fields and the client, log the changes, and notify nobody", async () => {
            const dapp = await approvedDapp({ pendingChange: change, pendingChangeAt: new Date() });

            const { body } = await post(`${dapp.id}/change/approve`, { expectedVersion: 1 }).expect(200);

            expect(body).toMatchObject({ name: "Acme Pay", webOrigins: ["https://pay.acme.xyz"], pendingChange: null, status: "approved" });
            expect(provisioner.clients.get("client_live")?.input).toEqual(change);
            const approved = await dataSource.manager.findOneByOrFail(DappEvent, { dappId: dapp.id, type: DappEventType.CHANGE_APPROVED });
            expect(approved.details).toEqual({
                changes: [
                    { field: "name", before: "Acme Wallet", after: "Acme Pay" },
                    { field: "webOrigins", before: ["https://acme.xyz"], after: ["https://pay.acme.xyz"] },
                ],
            });
            expect(slack.notify).not.toHaveBeenCalled();
        });

        it("should drop the pending change, resync the client to the live fields, and notify nobody", async () => {
            const dapp = await approvedDapp({ pendingChange: change, pendingChangeAt: new Date() });

            const { body } = await post(`${dapp.id}/change/reject`, { expectedVersion: 1 }).expect(200);

            expect(body).toMatchObject({ name: "Acme Wallet", pendingChange: null });
            expect(provisioner.calls).toEqual([
                { op: "updateClient", dappId: dapp.id, clientId: "client_live", input: syncedFieldsOf(dapp) },
            ]);
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["change_rejected", "auth0_updated"]);
            expect(slack.notify).not.toHaveBeenCalled();
        });

        it("should answer 409 NO_PENDING_CHANGE without a pending change", async () => {
            const dapp = await approvedDapp();

            expect((await post(`${dapp.id}/change/approve`, { expectedVersion: 1 }).expect(409)).body.message).toBe("NO_PENDING_CHANGE");
        });
    });

    describe("PUT /admin/dapps/:id", () => {
        it("should edit an approved dApp, sync its client, and notify nobody", async () => {
            const dapp = await approvedDapp();

            const { body } = await testApp.request
                .put(`/admin/dapps/${dapp.id}`)
                .set("Authorization", admin)
                .send({ ...dappForm({ name: "Acme by Admin" }), expectedVersion: 1 })
                .expect(200);

            expect(body).toMatchObject({ name: "Acme by Admin", status: "approved" });
            expect(provisioner.clients.get("client_live")?.input.name).toBe("Acme by Admin");
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["edited", "auth0_updated"]);
            expect(slack.notify).not.toHaveBeenCalled();
        });

        it("should notify nobody and call Auth0 for nothing when the edit changes nothing on a healthy dApp", async () => {
            const dapp = await approvedDapp();

            await testApp.request
                .put(`/admin/dapps/${dapp.id}`)
                .set("Authorization", admin)
                .send({ ...dappForm(), expectedVersion: 1 })
                .expect(200);

            expect(provisioner.calls).toEqual([]);
            expect(slack.notify).not.toHaveBeenCalled();
        });

        it("should resync an unchanged approved dApp whose last sync failed", async () => {
            const dapp = await approvedDapp({ auth0Error: "Auth0 update answered 503" });

            const { body } = await testApp.request
                .put(`/admin/dapps/${dapp.id}`)
                .set("Authorization", admin)
                .send({ ...dappForm(), expectedVersion: 1 })
                .expect(200);

            expect(body.auth0Error).toBeNull();
            expect(provisioner.calls).toHaveLength(1);
        });

        it("should refuse to edit an approved dApp with a pending change with 409 INVALID_TRANSITION", async () => {
            const dapp = await approvedDapp({ pendingChange: syncedFieldsOf(dappForm({ name: "Acme Pay" })), pendingChangeAt: new Date() });

            const { body } = await testApp.request
                .put(`/admin/dapps/${dapp.id}`)
                .set("Authorization", admin)
                .send({ ...dappForm(), expectedVersion: 1 })
                .expect(409);

            expect(body.message).toBe("INVALID_TRANSITION");
        });
    });

    describe("POST /admin/dapps/:id/remove", () => {
        it("should remove the dApp, delete its client, and notify nobody", async () => {
            const dapp = await approvedDapp();

            const { body } = await post(`${dapp.id}/remove`, { expectedVersion: 1 }).expect(200);

            expect(body).toMatchObject({ status: "removed" });
            expect(await dataSource.manager.findOneByOrFail(DappEvent, { dappId: dapp.id, type: DappEventType.REMOVED })).toMatchObject({
                actorRole: "admin",
                details: {},
            });
            expect(provisioner.clients.size).toBe(0);
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["removed", "auth0_deleted"]);
            expect(slack.notify).not.toHaveBeenCalled();
        });
    });

    describe("actions a dApp's status refuses", () => {
        it.each([
            [DappStatus.APPROVED, "approve"],
            [DappStatus.REJECTED, "approve"],
            [DappStatus.REMOVED, "approve"],
            [DappStatus.APPROVED, "reject"],
            [DappStatus.REJECTED, "reject"],
            [DappStatus.REMOVED, "reject"],
            [DappStatus.PENDING, "change/approve"],
            [DappStatus.REJECTED, "change/approve"],
            [DappStatus.REMOVED, "change/approve"],
            [DappStatus.PENDING, "change/reject"],
            [DappStatus.REJECTED, "change/reject"],
            [DappStatus.REMOVED, "change/reject"],
            [DappStatus.REMOVED, "remove"],
        ])("should answer 409 INVALID_TRANSITION when the dApp is %s and the action is %s", async (status, action) => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail: OWNER, status });

            const response = await post(`${dapp.id}/${action}`, { expectedVersion: 1 }).expect(409);

            expect(response.body.message).toBe("INVALID_TRANSITION");
            expect(provisioner.calls).toEqual([]);
        });

        it("should answer 409 INVALID_TRANSITION when an admin edits a removed dApp", async () => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail: OWNER, status: DappStatus.REMOVED });

            const { body } = await testApp.request
                .put(`/admin/dapps/${dapp.id}`)
                .set("Authorization", admin)
                .send({ ...dappForm(), expectedVersion: 1 })
                .expect(409);

            expect(body.message).toBe("INVALID_TRANSITION");
        });
    });

    describe("a write that fails partway", () => {
        let appendEvents: jest.SpyInstance;

        beforeEach(() => {
            appendEvents = jest.spyOn(DappWriteService.prototype, "appendEvents").mockRejectedValueOnce(new Error("insert failed"));
        });

        afterEach(() => {
            appendEvents.mockRestore();
        });

        it.each(["reject", "remove"])("should leave nothing of %s behind", async (action) => {
            const dapp = await pendingDapp();

            await post(`${dapp.id}/${action}`, { expectedVersion: 1 }).expect(500);

            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "pending",
                version: 1,
                removedAt: null,
            });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual([]);
        });

        it("should roll back an approval and let a retry reuse the Auth0 client it created", async () => {
            const dapp = await pendingDapp();

            await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(500);

            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "pending", version: 1, auth0ClientId: null });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual([]);
            expect(provisioner.clients.size).toBe(1);

            const { body } = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(200);

            expect(body.status).toBe("approved");
            expect(provisioner.clients.size).toBe(1);
        });
    });

    describe("GET /admin/dapps/:id/events", () => {
        it("should list the dApp's events with their actor and details", async () => {
            const dapp = await pendingDapp();
            await post(`${dapp.id}/reject`, { expectedVersion: 1 }).expect(200);

            const { body } = await testApp.request.get(`/admin/dapps/${dapp.id}/events`).set("Authorization", admin).expect(200);

            expect(body).toEqual([
                {
                    id: expect.any(String),
                    type: "rejected",
                    actorRole: "admin",
                    details: {},
                    createdAt: expect.any(String),
                },
            ]);
        });

        it("should answer 404 DAPP_NOT_FOUND for an unknown dApp", async () => {
            await testApp.request.get(`/admin/dapps/${UNKNOWN_ID}/events`).set("Authorization", admin).expect(404);
        });
    });

    describe("guards", () => {
        it("should refuse a user with 403 FORBIDDEN_ROLE", async () => {
            const { body } = await testApp.request
                .get("/admin/dapps")
                .set("Authorization", await bearer(OWNER))
                .expect(403);

            expect(body.message).toBe("FORBIDDEN_ROLE");
        });

        it("should refuse an unverified token carrying an admin email with 403 EMAIL_NOT_VERIFIED", async () => {
            const { body } = await testApp.request
                .get("/admin/dapps")
                .set("Authorization", await bearer(ADMIN_EMAIL, false))
                .expect(403);

            expect(body.message).toBe("EMAIL_NOT_VERIFIED");
        });
    });
});
