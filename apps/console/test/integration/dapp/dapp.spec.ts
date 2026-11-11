import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Dapp, DappEvent } from "@database/console/entities";
import { createDapp } from "@database/console/test/factories";
import { DappEventType, DappStatus, MauBracket, syncedFieldsOf } from "@shared/modules/dapp";
import { DappModule } from "../../../src/modules/dapp/dapp.module";
import { DappWriteService } from "../../../src/modules/dapp/dapp-write.service";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { bearer, testKeySet } from "../../mocks/auth/token.mock";
import { testConfig } from "../../mocks/config/config.mock";
import { dappForm, eventTypes, findDapp } from "../../mocks/dapp/dapp.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";

const OWNER = "bob@owners.test";

describe("DappModule (integration)", () => {
    const provisioner = new FakeProvisionerMock();
    const slack = new SlackNotifierMock();
    let testApp: TestApp;
    let dataSource: DataSource;
    let owner: string;

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
        owner = await bearer(OWNER);
    });

    /**
     * Stores an approved dApp for the owner whose Auth0 client exists in the fake provisioner.
     * @param overrides Fields to change.
     * @returns The dApp.
     */
    const approvedDapp = async (overrides: Partial<Dapp> = {}): Promise<Dapp> => {
        const form = dappForm();
        const dapp = await createDapp(dataSource.manager, {
            ...form,
            ownerEmail: OWNER,
            status: DappStatus.APPROVED,
            auth0ClientId: "client_live",
            reviewedAt: new Date(),
            ...overrides,
        });
        provisioner.clients.set("client_live", { dappId: dapp.id, input: { ...form } });
        return dapp;
    };

    describe("GET /dapp", () => {
        it("should answer a null dApp when the caller has none", async () => {
            const { body } = await testApp.request.get("/dapp").set("Authorization", owner).expect(200);

            expect(body).toEqual({ dapp: null });
        });

        it("should find the caller's live dApp by email in any case", async () => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail: OWNER });

            const { body } = await testApp.request
                .get("/dapp")
                .set("Authorization", await bearer("BOB@Owners.TEST"))
                .expect(200);

            expect(body.dapp).toMatchObject({ id: dapp.id, status: "pending", version: 1 });
        });
    });

    describe("POST /dapp", () => {
        it("should store a pending dApp, log `submitted`, and alert the admins on Slack", async () => {
            const { body } = await testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()).expect(201);

            expect(body).toEqual({
                id: expect.any(String),
                ...dappForm(),
                status: "pending",
                pendingChange: null,
                pendingChangeAt: null,
                auth0ClientId: null,
                version: 1,
                submittedAt: expect.any(String),
            });
            expect(await findDapp(dataSource.manager, body.id)).toMatchObject({ ownerEmail: OWNER, status: "pending" });
            expect(await eventTypes(dataSource.manager, body.id)).toEqual(["submitted"]);
            expect(slack.notify).toHaveBeenCalledWith(
                expect.objectContaining({ kind: "submitted", dapp: expect.objectContaining({ id: body.id }) }),
            );
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

        it("should leave no dApp behind when recording the submission fails", async () => {
            const appendEvents = jest.spyOn(DappWriteService.prototype, "appendEvents").mockRejectedValueOnce(new Error("insert failed"));

            await testApp.request
                .post("/dapp")
                .set("Authorization", await bearer("new@owners.test"))
                .send(dappForm())
                .expect(500);
            appendEvents.mockRestore();

            expect(await dataSource.manager.count(Dapp)).toBe(0);
        });

        it("should still answer 201 when the Slack alert fails", async () => {
            slack.notify.mockRejectedValueOnce(new Error("Slack is down"));

            const { body } = await testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()).expect(201);

            expect(await eventTypes(dataSource.manager, body.id)).toEqual(["submitted"]);
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
        ])("should refuse %s with 400 and store nothing", async (_case, overrides) => {
            await testApp.request
                .post("/dapp")
                .set("Authorization", owner)
                .send({ ...dappForm(), ...overrides })
                .expect(400);

            expect(await dataSource.manager.count(Dapp)).toBe(0);
        });
    });

    describe("PUT /dapp/:id", () => {
        it("should edit a pending dApp in place and log `edited`, the contact email by name only", async () => {
            const dapp = await createDapp(dataSource.manager, { ...dappForm(), ownerEmail: OWNER });
            const form = dappForm({ name: "Acme Pay", contactEmail: "ops@acme.xyz", mauBracket: MauBracket.GT_25K });

            const { body } = await testApp.request
                .put(`/dapp/${dapp.id}`)
                .set("Authorization", owner)
                .send({ ...form, expectedVersion: 1 })
                .expect(200);

            expect(body).toMatchObject({ name: "Acme Pay", contactEmail: "ops@acme.xyz", status: "pending", version: 2 });
            const [edited] = await dataSource.query(`SELECT details FROM dapp_event WHERE dapp_id = $1 AND type = 'edited'`, [dapp.id]);
            expect(edited.details).toEqual({
                changes: [
                    { field: "name", before: "Acme Wallet", after: "Acme Pay" },
                    { field: "contactEmail" },
                    { field: "mauBracket", before: "lt1k", after: "gt25k" },
                ],
            });
            expect(slack.notify).not.toHaveBeenCalled();
        });

        it("should resubmit a rejected dApp: pending again, review cleared, the admins alerted with what changed since the rejection", async () => {
            const dapp = await createDapp(dataSource.manager, {
                ...dappForm(),
                ownerEmail: OWNER,
                status: DappStatus.REJECTED,
                reviewedAt: new Date(),
                submittedAt: new Date("2026-01-01T00:00:00Z"),
            });

            const { body } = await testApp.request
                .put(`/dapp/${dapp.id}`)
                .set("Authorization", owner)
                .send({ ...dappForm({ logoUrl: "https://acme.xyz/logo.png" }), expectedVersion: 1 })
                .expect(200);

            expect(body).toMatchObject({ status: "pending" });
            expect(new Date(body.submittedAt).getTime()).toBeGreaterThan(new Date("2026-01-01T00:00:00Z").getTime());
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ reviewedAt: null });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["edited", "resubmitted"]);
            expect(slack.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "resubmitted" }));
        });

        it("should apply an approved dApp's direct fields at once without Auth0 or email", async () => {
            const dapp = await approvedDapp();

            const { body } = await testApp.request
                .put(`/dapp/${dapp.id}`)
                .set("Authorization", owner)
                .send({ ...dappForm({ contactEmail: "ops@acme.xyz" }), expectedVersion: 1 })
                .expect(200);

            expect(body).toMatchObject({ contactEmail: "ops@acme.xyz", status: "approved", pendingChange: null });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["edited"]);
            expect(provisioner.calls).toEqual([]);
            expect(slack.notify).not.toHaveBeenCalled();
        });

        it("should queue an approved dApp's synced changes for review, keep the live values and alert the admins", async () => {
            const dapp = await approvedDapp();

            const { body } = await testApp.request
                .put(`/dapp/${dapp.id}`)
                .set("Authorization", owner)
                .send({ ...dappForm({ name: "Acme Pay" }), expectedVersion: 1 })
                .expect(200);

            expect(body).toMatchObject({ name: "Acme Wallet", pendingChange: syncedFieldsOf(dappForm({ name: "Acme Pay" })) });
            expect(body.pendingChangeAt).toEqual(expect.any(String));
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["change_requested"]);
            expect(slack.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "change_requested" }));
            expect(provisioner.calls).toEqual([]);
        });

        it("should withdraw the pending change when the synced fields are back to live", async () => {
            const dapp = await approvedDapp({ pendingChange: syncedFieldsOf(dappForm({ name: "Acme Pay" })), pendingChangeAt: new Date() });

            const { body } = await testApp.request
                .put(`/dapp/${dapp.id}`)
                .set("Authorization", owner)
                .send({ ...dappForm(), expectedVersion: 1 })
                .expect(200);

            expect(body).toMatchObject({ pendingChange: null, pendingChangeAt: null });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["change_withdrawn"]);
        });

        it("should answer 409 DAPP_CHANGED for a stale expectedVersion and change nothing", async () => {
            const dapp = await createDapp(dataSource.manager, { ...dappForm(), ownerEmail: OWNER, version: 2 });

            const { body } = await testApp.request
                .put(`/dapp/${dapp.id}`)
                .set("Authorization", owner)
                .send({ ...dappForm({ name: "Stale" }), expectedVersion: 1 })
                .expect(409);

            expect(body).toMatchObject({ message: "DAPP_CHANGED" });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Wallet", version: 2 });
        });

        it("should refuse another owner's dApp: 404 without a live dApp of one's own, 409 DAPP_CHANGED with one", async () => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail: OWNER });
            const stranger = await bearer("stranger@owners.test");

            await testApp.request
                .put(`/dapp/${dapp.id}`)
                .set("Authorization", stranger)
                .send({ ...dappForm(), expectedVersion: 1 })
                .expect(404);
            await createDapp(dataSource.manager, { ownerEmail: "stranger@owners.test" });
            const { body } = await testApp.request
                .put(`/dapp/${dapp.id}`)
                .set("Authorization", stranger)
                .send({ ...dappForm(), expectedVersion: 1 })
                .expect(409);

            expect(body).toMatchObject({ message: "DAPP_CHANGED" });
        });

        it("should answer 400 Bad Request for an id that is not a uuid and for a missing expectedVersion", async () => {
            await createDapp(dataSource.manager, { ownerEmail: OWNER });

            await testApp.request
                .put("/dapp/not-a-uuid")
                .set("Authorization", owner)
                .send({ ...dappForm(), expectedVersion: 1 })
                .expect(400);
            await testApp.request
                .put("/dapp/00000000-0000-4000-8000-000000000000")
                .set("Authorization", owner)
                .send(dappForm())
                .expect(400);
        });
    });

    describe("DELETE /dapp/:id", () => {
        it("should remove a pending dApp with 204, log `removed` without a reason, and email nobody", async () => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail: OWNER });

            await testApp.request.delete(`/dapp/${dapp.id}?expectedVersion=1`).set("Authorization", owner).expect(204);

            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "removed" });
            expect(await dataSource.manager.findOneByOrFail(DappEvent, { dappId: dapp.id, type: DappEventType.REMOVED })).toMatchObject({
                actorRole: "user",
                details: {},
            });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["removed"]);
            expect(provisioner.calls).toEqual([{ op: "findClient", dappId: dapp.id }]);
            expect(slack.notify).not.toHaveBeenCalled();
        });

        it("should delete an approved dApp's client and clear its pending change", async () => {
            const dapp = await approvedDapp({ pendingChange: syncedFieldsOf(dappForm({ name: "Acme Pay" })), pendingChangeAt: new Date() });

            await testApp.request.delete(`/dapp/${dapp.id}?expectedVersion=1`).set("Authorization", owner).expect(204);

            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "removed", pendingChange: null });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["removed", "auth0_deleted"]);
            expect(provisioner.clients.size).toBe(0);
        });

        it("should let the owner submit again once the dApp is removed", async () => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail: OWNER });
            await testApp.request.delete(`/dapp/${dapp.id}?expectedVersion=1`).set("Authorization", owner).expect(204);

            await testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()).expect(201);
        });

        it("should answer 502 PROVISIONING_FAILED when Auth0 fails, keep the dApp and record the failure without a version bump", async () => {
            const dapp = await approvedDapp();
            provisioner.script("deleteClient", "failed");

            const { body } = await testApp.request.delete(`/dapp/${dapp.id}?expectedVersion=1`).set("Authorization", owner).expect(502);

            expect(body).toEqual({ statusCode: 502, message: "PROVISIONING_FAILED" });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "approved",
                version: 1,
                auth0Error: "Fake deleteClient: scripted failed",
            });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["auth0_failed"]);
        });

        it("should remove the dApp and record the Auth0 error when its client is tagged for another dApp", async () => {
            const dapp = await approvedDapp();
            provisioner.script("deleteClient", "tag_mismatch");

            await testApp.request.delete(`/dapp/${dapp.id}?expectedVersion=1`).set("Authorization", owner).expect(204);

            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "removed",
                auth0Error: "Fake deleteClient: scripted tag_mismatch",
            });
            expect(await eventTypes(dataSource.manager, dapp.id)).toEqual(["removed", "auth0_failed"]);
        });

        it("should answer 400 Bad Request for an expectedVersion that is not a number", async () => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail: OWNER });

            await testApp.request.delete(`/dapp/${dapp.id}?expectedVersion=latest`).set("Authorization", owner).expect(400);
        });
    });
});
