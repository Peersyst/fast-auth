import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Dapp } from "@database/console/entities";
import { createAutoApprovalSetting, createDapp } from "@database/console/test/factories";
import { DappStatus, EmailTemplate, syncedFieldsOf } from "@shared/modules/dapp";
import { AdminModule } from "../../../src/modules/admin/admin.module";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { EMAILER, SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { adminBearer, bearer, rotateBearerSubjects, testKeySet } from "../../mocks/auth/token.mock";
import { ADMIN_EMAIL, testConfig } from "../../mocks/config/config.mock";
import { dappForm, eventTypes, findDapp, REASON } from "../../mocks/dapp/dapp.mock";
import { EmailerMock } from "../../mocks/notification/emailer.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";
import { BUSINESS_EXCEPTION_FILTER } from "../../../src/modules/common/exception/business-exception.filter";

const OWNER = "bob@owners.test";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

describe("AdminModule (integration)", () => {
    const provisioner = new FakeProvisionerMock();
    const emailer = new EmailerMock();
    const slack = new SlackNotifierMock();
    let testApp: TestApp;
    let dataSource: DataSource;
    let admin: string;

    beforeAll(async () => {
        testApp = await createTestApp({
            providers: [BUSINESS_EXCEPTION_FILTER],
            imports: [
                ConfigModule.forRoot({ load: [testConfig], isGlobal: true }),
                TypeOrmModule.forRoot(testConfig().database),
                ScheduleModule.forRoot(),
                AdminModule,
            ],
            overrides: [
                { provide: JWT_KEY_SET, useValue: await testKeySet() },
                { provide: EMAILER, useValue: emailer },
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
        await createAutoApprovalSetting(dataSource.manager);
        rotateBearerSubjects();
        provisioner.reset();
        emailer.clearMocks();
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
            expect(body.items[0]).toMatchObject({ ownerEmail: "a@owners.test", reviewedBy: null, auth0Error: null });
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

        it("should filter by status and search case-insensitively with LIKE wildcards taken literally", async () => {
            const match = await pendingDapp({ ownerEmail: "a@owners.test", name: "Acme 100% Wallet" });
            await pendingDapp({ ownerEmail: "b@owners.test", name: "Acme 100 Wallet" });

            const { body } = await testApp.request.get("/admin/dapps?status=pending&q=100%25").set("Authorization", admin).expect(200);

            expect(body.items.map((item: { id: string }) => item.id)).toEqual([match.id]);
        });

        it("should sort by the requested column and order", async () => {
            await pendingDapp({ ownerEmail: "a@owners.test", name: "Alpha" });
            await pendingDapp({ ownerEmail: "b@owners.test", name: "Zulu" });

            const { body } = await testApp.request.get("/admin/dapps?orderBy=name&order=DESC").set("Authorization", admin).expect(200);

            expect(body.items.map((item: { name: string }) => item.name)).toEqual(["Zulu", "Alpha"]);
        });

        it.each([
            ["page=0", "page"],
            ["pageSize=101", "pageSize"],
            ["status=gone", "status"],
            ["orderBy=owner", "orderBy"],
            ["q=acme%00", "q"],
            ["order=desc", "order"],
        ])("should refuse %s with 400 VALIDATION_FAILED naming the field", async (query, field) => {
            const { body } = await testApp.request.get(`/admin/dapps?${query}`).set("Authorization", admin).expect(400);

            expect(body).toEqual({ statusCode: 400, message: "VALIDATION_FAILED", fields: [field] });
        });
    });

    describe("GET /admin/dapps/:id", () => {
        it("should answer the admin view of a dApp in any status", async () => {
            const dapp = await pendingDapp({ status: DappStatus.REMOVED, removedBy: ADMIN_EMAIL, removalReason: REASON });

            const { body } = await testApp.request.get(`/admin/dapps/${dapp.id}`).set("Authorization", admin).expect(200);

            expect(body).toMatchObject({
                id: dapp.id,
                status: "removed",
                ownerEmail: OWNER,
                removedBy: ADMIN_EMAIL,
                removalReason: REASON,
            });
        });

        it("should answer 404 DAPP_NOT_FOUND for an unknown id and 400 for an id that is not a uuid", async () => {
            const { body } = await testApp.request.get(`/admin/dapps/${UNKNOWN_ID}`).set("Authorization", admin).expect(404);

            expect(body).toEqual({ statusCode: 404, message: "DAPP_NOT_FOUND" });
            await testApp.request.get("/admin/dapps/not-a-uuid").set("Authorization", admin).expect(400);
        });
    });

    describe("POST /admin/dapps/:id/approve", () => {
        it("should create the Auth0 client from the synced fields, approve the dApp and email the owner its client id", async () => {
            const dapp = await pendingDapp();

            const { body } = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(200);

            expect(body).toMatchObject({
                status: "approved",
                auth0ClientId: expect.stringMatching(/^fake_/),
                reviewedBy: ADMIN_EMAIL,
                version: 2,
            });
            expect(provisioner.calls).toEqual([
                { op: "findClient", dappId: dapp.id },
                { op: "createClient", dappId: dapp.id, input: syncedFieldsOf(dapp) },
            ]);
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["approved", "auth0_created", "email_sent"]);
            expect(emailer.send).toHaveBeenCalledWith(
                expect.objectContaining({ template: EmailTemplate.DAPP_APPROVED, to: OWNER, clientId: body.auth0ClientId }),
            );
        });

        it("should reuse the client already tagged with the dApp instead of creating another", async () => {
            const dapp = await pendingDapp();
            provisioner.clients.set("client_orphan", { dappId: dapp.id, input: syncedFieldsOf(dapp) });

            const { body } = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(200);

            expect(body.auth0ClientId).toBe("client_orphan");
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["approved", "auth0_updated", "email_sent"]);
        });

        it("should answer 502 PROVISIONING_FAILED, keep the dApp pending at its version, and let a retry at that version approve it", async () => {
            const dapp = await pendingDapp();
            provisioner.script("createClient", "failed");

            const { body } = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(502);

            expect(body.message).toBe("PROVISIONING_FAILED");
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "pending",
                version: 1,
                auth0Error: "Fake createClient: scripted failed",
            });
            const retried = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(200);
            expect(retried.body).toMatchObject({ status: "approved", auth0Error: null });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["auth0_failed", "approved", "auth0_created", "email_sent"]);
        });

        it("should answer 422 PROVISIONING_REJECTED when Auth0 refuses the client", async () => {
            const dapp = await pendingDapp();
            provisioner.script("createClient", "rejected");

            const { body } = await post(`${dapp.id}/approve`, { expectedVersion: 1 }).expect(422);

            expect(body.message).toBe("PROVISIONING_REJECTED");
        });

        it("should answer 409 INVALID_TRANSITION for an approved dApp and 409 DAPP_CHANGED for a stale version", async () => {
            const approved = await approvedDapp();
            const pending = await pendingDapp({ ownerEmail: "other@owners.test", version: 3 });

            expect((await post(`${approved.id}/approve`, { expectedVersion: 1 }).expect(409)).body.message).toBe("INVALID_TRANSITION");
            expect((await post(`${pending.id}/approve`, { expectedVersion: 2 }).expect(409)).body.message).toBe("DAPP_CHANGED");
            expect(provisioner.calls).toEqual([]);
        });

        it("should answer 404 DAPP_NOT_FOUND for an unknown dApp", async () => {
            await post(`${UNKNOWN_ID}/approve`, { expectedVersion: 1 }).expect(404);
        });
    });

    describe("POST /admin/dapps/:id/reject", () => {
        it("should reject the dApp with the reason, delete any client tagged with it, and email the owner the reason", async () => {
            const dapp = await pendingDapp();
            provisioner.clients.set("client_orphan", { dappId: dapp.id, input: syncedFieldsOf(dapp) });

            const { body } = await post(`${dapp.id}/reject`, { expectedVersion: 1, reason: `  ${REASON}  ` }).expect(200);

            expect(body).toMatchObject({ status: "rejected", rejectionReason: REASON, reviewedBy: ADMIN_EMAIL });
            expect(provisioner.clients.size).toBe(0);
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["rejected", "auth0_deleted", "email_sent"]);
            expect(emailer.send).toHaveBeenCalledWith(expect.objectContaining({ template: EmailTemplate.DAPP_REJECTED, reason: REASON }));
        });

        it.each([
            ["shorter than 10", "Too short"],
            ["longer than 2000", "x".repeat(2001)],
            ["with a NUL", `${REASON}\u0000`],
        ])("should refuse a reason %s with 400 VALIDATION_FAILED naming it", async (_case, reason) => {
            const dapp = await pendingDapp();

            const { body } = await post(`${dapp.id}/reject`, { expectedVersion: 1, reason }).expect(400);

            expect(body).toEqual({ statusCode: 400, message: "VALIDATION_FAILED", fields: ["reason"] });
        });
    });

    describe("POST /admin/dapps/:id/change/approve and change/reject", () => {
        const change = syncedFieldsOf(dappForm({ name: "Acme Pay", webOrigins: ["https://pay.acme.xyz"] }));

        it("should apply the pending change to the fields and the client, log the changes, and email the owner", async () => {
            const dapp = await approvedDapp({ pendingChange: change, pendingChangeAt: new Date() });

            const { body } = await post(`${dapp.id}/change/approve`, { expectedVersion: 1 }).expect(200);

            expect(body).toMatchObject({ name: "Acme Pay", webOrigins: ["https://pay.acme.xyz"], pendingChange: null, status: "approved" });
            expect(provisioner.clients.get("client_live")?.input).toEqual(change);
            const [approved] = await dataSource.query(`SELECT details FROM dapp_event WHERE dapp_id = $1 AND type = 'change_approved'`, [
                dapp.id,
            ]);
            expect(approved.details).toEqual({
                changes: [
                    { field: "name", before: "Acme Wallet", after: "Acme Pay" },
                    { field: "webOrigins", before: ["https://acme.xyz"], after: ["https://pay.acme.xyz"] },
                ],
            });
            expect(emailer.send).toHaveBeenCalledWith(expect.objectContaining({ template: EmailTemplate.CHANGE_APPROVED }));
        });

        it("should drop the pending change, resync the client to the live fields, and email the owner the reason", async () => {
            const dapp = await approvedDapp({ pendingChange: change, pendingChangeAt: new Date() });

            const { body } = await post(`${dapp.id}/change/reject`, { expectedVersion: 1, reason: REASON }).expect(200);

            expect(body).toMatchObject({ name: "Acme Wallet", pendingChange: null });
            expect(provisioner.calls).toEqual([
                { op: "updateClient", dappId: dapp.id, clientId: "client_live", input: syncedFieldsOf(dapp) },
            ]);
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["change_rejected", "auth0_updated", "email_sent"]);
            expect(emailer.send).toHaveBeenCalledWith(expect.objectContaining({ template: EmailTemplate.CHANGE_REJECTED, reason: REASON }));
        });

        it("should answer 409 NO_PENDING_CHANGE without a pending change", async () => {
            const dapp = await approvedDapp();

            expect((await post(`${dapp.id}/change/approve`, { expectedVersion: 1 }).expect(409)).body.message).toBe("NO_PENDING_CHANGE");
        });
    });

    describe("PUT /admin/dapps/:id", () => {
        it("should edit an approved dApp, sync its client, and email the owner", async () => {
            const dapp = await approvedDapp();

            const { body } = await testApp.request
                .put(`/admin/dapps/${dapp.id}`)
                .set("Authorization", admin)
                .send({ ...dappForm({ name: "Acme by Admin" }), expectedVersion: 1 })
                .expect(200);

            expect(body).toMatchObject({ name: "Acme by Admin", status: "approved" });
            expect(provisioner.clients.get("client_live")?.input.name).toBe("Acme by Admin");
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["edited", "auth0_updated", "email_sent"]);
            expect(emailer.send).toHaveBeenCalledWith(expect.objectContaining({ template: EmailTemplate.CHANGED_BY_ADMIN }));
        });

        it("should email nobody and call Auth0 for nothing when the edit changes nothing on a healthy dApp", async () => {
            const dapp = await approvedDapp();

            await testApp.request
                .put(`/admin/dapps/${dapp.id}`)
                .set("Authorization", admin)
                .send({ ...dappForm(), expectedVersion: 1 })
                .expect(200);

            expect(provisioner.calls).toEqual([]);
            expect(emailer.send).not.toHaveBeenCalled();
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

    describe("POST /admin/dapps/:id/owner", () => {
        it("should move the dApp to another owner and email nobody", async () => {
            const dapp = await pendingDapp();

            const { body } = await post(`${dapp.id}/owner`, { expectedVersion: 1, ownerEmail: "new@owners.test" }).expect(200);

            expect(body).toMatchObject({ ownerEmail: "new@owners.test", status: "pending", version: 2 });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["owner_changed"]);
            expect(emailer.send).not.toHaveBeenCalled();
        });

        it("should answer 409 DAPP_ALREADY_EXISTS when the new owner already has a live dApp, and refuse an invalid email", async () => {
            const dapp = await pendingDapp();
            await pendingDapp({ ownerEmail: "taken@owners.test" });

            expect((await post(`${dapp.id}/owner`, { expectedVersion: 1, ownerEmail: "TAKEN@owners.test" }).expect(409)).body.message).toBe(
                "DAPP_ALREADY_EXISTS",
            );
            await post(`${dapp.id}/owner`, { expectedVersion: 1, ownerEmail: "not-an-email" }).expect(400);
        });
    });

    describe("POST /admin/dapps/:id/remove", () => {
        it("should remove the dApp with the reason, delete its client, and email the owner the reason", async () => {
            const dapp = await approvedDapp();

            const { body } = await post(`${dapp.id}/remove`, { expectedVersion: 1, reason: REASON }).expect(200);

            expect(body).toMatchObject({ status: "removed", removedBy: ADMIN_EMAIL, removalReason: REASON });
            expect(provisioner.clients.size).toBe(0);
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["removed", "auth0_deleted", "email_sent"]);
            expect(emailer.send).toHaveBeenCalledWith(
                expect.objectContaining({ template: EmailTemplate.REMOVED_BY_ADMIN, reason: REASON }),
            );
        });
    });

    describe("GET /admin/dapps/:id/events", () => {
        it("should list the events newest first with their actor and details", async () => {
            const dapp = await pendingDapp();
            await post(`${dapp.id}/reject`, { expectedVersion: 1, reason: REASON }).expect(200);

            const { body } = await testApp.request.get(`/admin/dapps/${dapp.id}/events`).set("Authorization", admin).expect(200);

            expect(body).toEqual([
                {
                    id: expect.any(String),
                    type: "email_sent",
                    actorEmail: null,
                    actorRole: "system",
                    details: { template: "dapp_rejected" },
                    createdAt: expect.any(String),
                },
                {
                    id: expect.any(String),
                    type: "rejected",
                    actorEmail: ADMIN_EMAIL,
                    actorRole: "admin",
                    details: { reason: REASON },
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
