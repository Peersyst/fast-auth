import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { register } from "prom-client";
import { DataSource, EntityManager, EntityTarget } from "typeorm";
import { Dapp, DappChange } from "@database/console/entities";
import { createDapp, createDappChange } from "@database/console/test/factories";
import { DappChangeStatus, DappStatus, MauBracket } from "@shared/modules/dapp";
import { DappModule } from "../../../src/modules/dapp/dapp.module";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { adminBearer, bearer, testKeySet } from "../../mocks/auth/token.mock";
import { testConfig } from "../../mocks/config/config.mock";
import { dappForm, findChanges, findDapp, transitionCounts } from "../../mocks/dapp/dapp.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";

describe("dApp review (integration)", () => {
    const ownerEmail = "bob@owners.test";
    const unknownId = "00000000-0000-4000-8000-000000000000";
    const provisioner = new FakeProvisionerMock();
    const slack = new SlackNotifierMock();
    let testApp: TestApp;
    let dataSource: DataSource;
    let admin: string;
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
        register.resetMetrics();
        provisioner.reset();
        slack.clearMocks();
        admin = await adminBearer();
        owner = await bearer(ownerEmail);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * Stores a pending dApp.
     * @param overrides Fields to change.
     * @returns The dApp.
     */
    const pendingDapp = (overrides: Partial<Dapp> = {}): Promise<Dapp> =>
        createDapp(dataSource.manager, { ...dappForm(), ownerEmail, ...overrides });

    /**
     * Stores an approved dApp whose Auth0 client exists in the fake provisioner.
     * @param overrides Fields to change.
     * @returns The dApp.
     */
    const approvedDapp = async (overrides: Partial<Dapp> = {}): Promise<Dapp> => {
        const dapp = await pendingDapp({ status: DappStatus.APPROVED, auth0ClientId: "client_live", ...overrides });
        provisioner.clients.set("client_live", {
            dappId: dapp.id,
            name: dapp.name,
            description: dapp.description,
            logoUrl: dapp.logoUrl,
            callbackUrls: dapp.callbackUrls,
            logoutUrls: dapp.logoutUrls,
            webOrigins: dapp.webOrigins,
        });
        return dapp;
    };

    /**
     * Sends a review action as the admin.
     * @param path The route under /dapp.
     * @returns The pending request.
     */
    const review = (path: string) => testApp.request.post(`/dapp/${path}`).set("Authorization", admin);

    /**
     * Sends a PATCH to the dApp as its owner.
     * @param id The dApp id.
     * @param body The fields to change.
     * @returns The pending request.
     */
    const patch = (id: string, body: Record<string, unknown>) =>
        testApp.request.patch(`/dapp/${id}`).set("Authorization", owner).send(body);

    /**
     * Runs another request after the next read of an entity answers, so it changes the row before the request that read it writes.
     * @param run The request to run.
     * @param entity The entity whose read triggers it. Defaults to the dApp.
     */
    const duringNextRead = (run: () => Promise<unknown>, entity: EntityTarget<unknown> = Dapp): void => {
        const { manager } = dataSource;
        const read = EntityManager.prototype.findOneBy.bind(manager);
        let pending = true;
        jest.spyOn(manager, "findOneBy").mockImplementation(async (...args: Parameters<typeof read>) => {
            const row = await read(...args);
            if (pending && args[0] === entity) {
                pending = false;
                await run();
            }
            return row;
        });
    };

    describe("POST /dapp/:id/approve", () => {
        it("should create the Auth0 client, configure it with the dApp's fields and approve the dApp", async () => {
            const dapp = await pendingDapp();

            const { body } = await review(`${dapp.id}/approve`).expect(200);

            expect(body).toEqual({
                id: dapp.id,
                ownerEmail,
                ...dappForm(),
                status: "approved",
                auth0ClientId: expect.stringMatching(/^fake_/),
                reviewedAt: expect.any(String),
                pendingChange: null,
                createdAt: dapp.createdAt.toISOString(),
            });
            expect(provisioner.calls).toEqual([
                {
                    dappId: dapp.id,
                    name: "Acme Wallet",
                    description: "A wallet for NEAR.",
                    logoUrl: "https://cdn.acme.xyz/logo.png",
                    callbackUrls: ["https://acme.xyz/callback"],
                    logoutUrls: [],
                    webOrigins: ["https://acme.xyz"],
                },
                {
                    dappId: dapp.id,
                    clientId: body.auth0ClientId,
                    name: "Acme Wallet",
                    description: "A wallet for NEAR.",
                    logoUrl: "https://cdn.acme.xyz/logo.png",
                    callbackUrls: ["https://acme.xyz/callback"],
                    logoutUrls: [],
                    webOrigins: ["https://acme.xyz"],
                },
            ]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "approved",
                auth0ClientId: body.auth0ClientId,
                reviewedAt: new Date(body.reviewedAt),
            });
            expect(slack.notify).not.toHaveBeenCalled();
            expect(await transitionCounts()).toEqual({ "approve success": 1 });
        });

        it("should leave the dApp pending without a client when creating the Auth0 client fails", async () => {
            const dapp = await pendingDapp();
            provisioner.script("failed");

            await review(`${dapp.id}/approve`).expect(500);

            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "pending",
                auth0ClientId: null,
                reviewedAt: null,
            });
            expect(provisioner.clients.size).toBe(0);
        });

        it("should leave the dApp pending with its new client stored when configuring it fails", async () => {
            const dapp = await pendingDapp();
            provisioner.script("success").script("failed");

            await review(`${dapp.id}/approve`).expect(500);

            const [clientId] = provisioner.clients.keys();
            expect(clientId).toMatch(/^fake_/);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "pending",
                auth0ClientId: clientId,
                reviewedAt: null,
            });
        });

        it("should log the new client as a possible orphan and leave the dApp pending when storing it fails", async () => {
            const dapp = await pendingDapp();
            const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation();
            jest.spyOn(dataSource.manager, "update").mockRejectedValueOnce(new Error("connection lost"));

            await review(`${dapp.id}/approve`).expect(500);

            const [clientId] = provisioner.clients.keys();
            expect(clientId).toMatch(/^fake_/);
            expect(warn.mock.calls).toEqual([[`Auth0 client ${clientId} of dApp ${dapp.id} may be an orphan: storing it failed`]]);
            expect(provisioner.calls.map((call) => call.clientId)).toEqual([undefined]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "pending",
                auth0ClientId: null,
                reviewedAt: null,
            });
        });

        it("should reuse the stored client when an approval that failed after creating it is retried", async () => {
            const dapp = await pendingDapp();
            provisioner.script("success").script("failed");
            await review(`${dapp.id}/approve`).expect(500);
            const [clientId] = provisioner.clients.keys();

            const { body } = await review(`${dapp.id}/approve`).expect(200);

            expect(body).toMatchObject({ status: "approved", auth0ClientId: clientId });
            expect(provisioner.calls.map((call) => call.clientId)).toEqual([undefined, clientId, clientId]);
            expect([...provisioner.clients.keys()]).toEqual([clientId]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "approved",
                auth0ClientId: clientId,
                reviewedAt: new Date(body.reviewedAt),
            });
            expect(await transitionCounts()).toEqual({ "approve success": 1 });
        });

        it("should configure the stored client with the dApp's current fields", async () => {
            const dapp = await pendingDapp({ auth0ClientId: "client_half", name: "Acme Pay" });

            const { body } = await review(`${dapp.id}/approve`).expect(200);

            expect(body).toMatchObject({ status: "approved", auth0ClientId: "client_half", name: "Acme Pay" });
            expect(provisioner.clients.get("client_half")).toMatchObject({ dappId: dapp.id, name: "Acme Pay" });
            expect(provisioner.calls.map((call) => call.clientId)).toEqual(["client_half"]);
        });

        it.each([DappStatus.APPROVED, DappStatus.REJECTED])("should answer 409 INVALID_TRANSITION for a %s dApp", async (status) => {
            const dapp = await pendingDapp({ status });

            const { body } = await review(`${dapp.id}/approve`).expect(409);

            expect(body).toEqual({ statusCode: 409, message: "INVALID_TRANSITION" });
            expect(provisioner.calls).toEqual([]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status });
        });

        it("should answer 404 DAPP_NOT_FOUND for an unknown id", async () => {
            const { body } = await review(`${unknownId}/approve`).expect(404);

            expect(body).toEqual({ statusCode: 404, message: "DAPP_NOT_FOUND" });
        });

        it("should answer 409 ORIGIN_TAKEN to a dApp that lists a web origin an approved dApp has, leaving it pending and Auth0 untouched", async () => {
            await pendingDapp({
                ownerEmail: "first@owners.test",
                status: DappStatus.APPROVED,
                auth0ClientId: "client_first",
                webOrigins: ["https://acme.xyz", "https://shared.xyz"],
            });
            const dapp = await pendingDapp({ webOrigins: ["https://pay.xyz", "https://shared.xyz"] });

            const { status, body } = await review(`${dapp.id}/approve`);

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "ORIGIN_TAKEN" } });
            expect(provisioner.calls).toEqual([]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "pending", auth0ClientId: null });
        });

        it.each<[string, Partial<Dapp>]>([
            ["pending with a client", { status: DappStatus.PENDING, auth0ClientId: "client_first" }],
            ["rejected with a client", { status: DappStatus.REJECTED, auth0ClientId: "client_first" }],
            ["removed with a client", { status: DappStatus.REMOVED, auth0ClientId: "client_first" }],
            ["approved but without a client", { status: DappStatus.APPROVED, auth0ClientId: null }],
        ])("should approve a dApp whose web origin another dApp lists that is %s", async (_case, other) => {
            await pendingDapp({ ownerEmail: "first@owners.test", ...other });
            const dapp = await pendingDapp();

            const { body } = await review(`${dapp.id}/approve`).expect(200);

            expect(body).toMatchObject({ status: "approved", webOrigins: ["https://acme.xyz"] });
        });

        it("should approve a dApp whose web origin an approved dApp lists only in a pending change", async () => {
            const first = await pendingDapp({
                ownerEmail: "first@owners.test",
                status: DappStatus.APPROVED,
                auth0ClientId: "client_first",
                webOrigins: ["https://first.xyz"],
            });
            await createDappChange(dataSource.manager, { dappId: first.id, webOrigins: ["https://acme.xyz"] });
            const dapp = await pendingDapp();

            const { body } = await review(`${dapp.id}/approve`).expect(200);

            expect(body).toMatchObject({ status: "approved" });
        });

        it("should approve an unrelated dApp while another approved dApp lists different origins", async () => {
            await pendingDapp({
                ownerEmail: "first@owners.test",
                status: DappStatus.APPROVED,
                auth0ClientId: "client_first",
                webOrigins: ["https://first.xyz"],
            });
            const dapp = await pendingDapp();

            const { body } = await review(`${dapp.id}/approve`).expect(200);

            expect(body).toMatchObject({ status: "approved", webOrigins: ["https://acme.xyz"] });
        });
    });

    describe("POST /dapp/:id/reject", () => {
        it("should reject a pending dApp without calling Auth0", async () => {
            const dapp = await pendingDapp();

            const { body } = await review(`${dapp.id}/reject`).expect(200);

            expect(body).toEqual({
                id: dapp.id,
                ownerEmail,
                ...dappForm(),
                status: "rejected",
                auth0ClientId: null,
                reviewedAt: expect.any(String),
                pendingChange: null,
                createdAt: dapp.createdAt.toISOString(),
            });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "rejected",
                reviewedAt: new Date(body.reviewedAt),
            });
            expect(provisioner.calls).toEqual([]);
            expect(slack.notify).not.toHaveBeenCalled();
            expect(await transitionCounts()).toEqual({ "reject success": 1 });
        });

        it("should reject a dApp whose approval failed after creating its client, keeping the client stored but unseen", async () => {
            const dapp = await pendingDapp({ auth0ClientId: "client_half" });

            const { body } = await review(`${dapp.id}/reject`).expect(200);

            expect(body).toMatchObject({ status: "rejected", auth0ClientId: null });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "rejected", auth0ClientId: "client_half" });
            expect(provisioner.calls).toEqual([]);
        });

        it("should answer 409 INVALID_TRANSITION for an approved dApp and 404 DAPP_NOT_FOUND for an unknown id", async () => {
            const dapp = await createDapp(dataSource.manager, { status: DappStatus.APPROVED, auth0ClientId: "client_live" });

            const conflict = await review(`${dapp.id}/reject`).expect(409);
            const missing = await review(`${unknownId}/reject`).expect(404);

            expect(conflict.body).toEqual({ statusCode: 409, message: "INVALID_TRANSITION" });
            expect(missing.body).toEqual({ statusCode: 404, message: "DAPP_NOT_FOUND" });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "approved" });
        });
    });

    describe("POST /dapp/:id/change/approve", () => {
        it("should write the synced fields to Auth0, apply the change and approve it", async () => {
            const dapp = await approvedDapp({ reviewedAt: new Date("2026-01-05T00:00:00Z") });
            const change = await createDappChange(dataSource.manager, {
                dappId: dapp.id,
                name: "Acme Pay",
                webOrigins: ["https://pay.acme.xyz"],
            });

            const { body } = await review(`${dapp.id}/change/approve`).expect(200);

            expect(body).toEqual({
                id: dapp.id,
                ownerEmail,
                ...dappForm({ name: "Acme Pay", webOrigins: ["https://pay.acme.xyz"] }),
                status: "approved",
                auth0ClientId: "client_live",
                reviewedAt: "2026-01-05T00:00:00.000Z",
                pendingChange: null,
                createdAt: dapp.createdAt.toISOString(),
            });
            expect(provisioner.calls).toEqual([
                {
                    dappId: dapp.id,
                    clientId: "client_live",
                    name: "Acme Pay",
                    description: "A wallet for NEAR.",
                    logoUrl: "https://cdn.acme.xyz/logo.png",
                    callbackUrls: ["https://acme.xyz/callback"],
                    logoutUrls: [],
                    webOrigins: ["https://pay.acme.xyz"],
                },
            ]);
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([
                expect.objectContaining({ id: change.id, status: "approved", reviewedAt: expect.any(Date) }),
            ]);
            expect(slack.notify).not.toHaveBeenCalled();
            expect(await transitionCounts()).toEqual({ "approveChange success": 1 });
        });

        it("should update the Auth0 client for a contact email and MAU change, so it gets the grants it lacks", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, {
                dappId: dapp.id,
                name: null,
                contactEmail: "ops@acme.xyz",
                mauBracket: MauBracket.GT_25K,
            });

            const { body } = await review(`${dapp.id}/change/approve`).expect(200);

            expect(body).toMatchObject({ name: "Acme Wallet", contactEmail: "ops@acme.xyz", mauBracket: "gt25k", pendingChange: null });
            expect(provisioner.calls).toEqual([expect.objectContaining({ dappId: dapp.id, clientId: "client_live", name: "Acme Wallet" })]);
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([expect.objectContaining({ status: "approved" })]);
        });

        it("should leave the dApp as it was and the change pending when the Auth0 call fails", async () => {
            const dapp = await approvedDapp();
            const change = await createDappChange(dataSource.manager, { dappId: dapp.id });
            provisioner.script("failed");

            await review(`${dapp.id}/change/approve`).expect(500);

            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Wallet" });
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([
                expect.objectContaining({ id: change.id, status: "pending", reviewedAt: null }),
            ]);
            expect(provisioner.clients.get("client_live")).toMatchObject({ name: "Acme Wallet" });
        });

        it("should open its transaction only after the Auth0 call answers", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            const transaction = jest.spyOn(dataSource, "transaction");
            let openedBeforeAuth0 = -1;
            provisioner.during("update", async () => (openedBeforeAuth0 = transaction.mock.calls.length));

            await review(`${dapp.id}/change/approve`).expect(200);

            expect(openedBeforeAuth0).toBe(0);
            expect(transaction).toHaveBeenCalledTimes(1);
        });

        it.each([DappChangeStatus.APPROVED, DappChangeStatus.REJECTED])(
            "should answer 404 DAPP_CHANGE_NOT_FOUND for a dApp whose only change is %s",
            async (status) => {
                const dapp = await approvedDapp();
                await createDappChange(dataSource.manager, { dappId: dapp.id, status });

                const { body } = await review(`${dapp.id}/change/approve`).expect(404);

                expect(body).toEqual({ statusCode: 404, message: "DAPP_CHANGE_NOT_FOUND" });
                expect(provisioner.calls).toEqual([]);
                expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Wallet" });
            },
        );

        it.each([
            ["a pending dApp", { status: DappStatus.PENDING, auth0ClientId: null }],
            ["an approved dApp without an Auth0 client", { auth0ClientId: null }],
        ])("should answer 409 INVALID_TRANSITION for %s without calling Auth0", async (_case, overrides) => {
            const dapp = await approvedDapp(overrides);
            const change = await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });

            const { body } = await review(`${dapp.id}/change/approve`).expect(409);

            expect(body).toEqual({ statusCode: 409, message: "INVALID_TRANSITION" });
            expect(provisioner.calls).toEqual([]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Wallet" });
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([expect.objectContaining({ id: change.id, status: "pending" })]);
        });

        it("should answer 404 for an unknown dApp and leave another dApp's pending change alone", async () => {
            const dapp = await approvedDapp();
            const other = await approvedDapp({ ownerEmail: "other@owners.test", auth0ClientId: "client_other" });
            await createDappChange(dataSource.manager, { dappId: other.id });

            const unknownDapp = await review(`${unknownId}/change/approve`).expect(404);
            const noChange = await review(`${dapp.id}/change/approve`).expect(404);

            expect(unknownDapp.body).toEqual({ statusCode: 404, message: "DAPP_NOT_FOUND" });
            expect(noChange.body).toEqual({ statusCode: 404, message: "DAPP_CHANGE_NOT_FOUND" });
            expect(await findChanges(dataSource.manager, other.id)).toEqual([expect.objectContaining({ status: "pending" })]);
            expect(provisioner.calls).toEqual([]);
        });

        it("should answer 409 ORIGIN_TAKEN to a change that adds a web origin another approved dApp has, leaving the change pending and Auth0 untouched", async () => {
            const dapp = await approvedDapp();
            await pendingDapp({
                ownerEmail: "first@owners.test",
                status: DappStatus.APPROVED,
                auth0ClientId: "client_first",
                webOrigins: ["https://shared.xyz"],
            });
            const change = await createDappChange(dataSource.manager, {
                dappId: dapp.id,
                webOrigins: ["https://acme.xyz", "https://shared.xyz"],
            });

            const { status, body } = await review(`${dapp.id}/change/approve`);

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "ORIGIN_TAKEN" } });
            expect(provisioner.calls).toEqual([]);
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([expect.objectContaining({ id: change.id, status: "pending" })]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ webOrigins: ["https://acme.xyz"] });
        });

        it("should approve a change that adds a free web origin, and one that keeps a web origin the dApp already shares with another", async () => {
            const dapp = await approvedDapp();
            await pendingDapp({
                ownerEmail: "first@owners.test",
                status: DappStatus.APPROVED,
                auth0ClientId: "client_first",
                webOrigins: ["https://acme.xyz"],
            });
            await createDappChange(dataSource.manager, { dappId: dapp.id, webOrigins: ["https://acme.xyz", "https://pay.xyz"] });

            const { body } = await review(`${dapp.id}/change/approve`).expect(200);

            expect(body).toMatchObject({ webOrigins: ["https://acme.xyz", "https://pay.xyz"], pendingChange: null });
        });
    });

    describe("POST /dapp/:id/change/reject", () => {
        it("should reject the change and leave the dApp and Auth0 as they are", async () => {
            const dapp = await approvedDapp();
            const change = await createDappChange(dataSource.manager, { dappId: dapp.id });

            const { body } = await review(`${dapp.id}/change/reject`).expect(200);

            expect(body).toMatchObject({ name: "Acme Wallet", pendingChange: null });
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([
                expect.objectContaining({ id: change.id, status: "rejected", reviewedAt: expect.any(Date) }),
            ]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Wallet" });
            expect(provisioner.calls).toEqual([]);
            expect(await transitionCounts()).toEqual({ "rejectChange success": 1 });
        });

        it("should answer 404 DAPP_CHANGE_NOT_FOUND for a dApp with no pending change and leave another dApp's change alone", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, { dappId: dapp.id, status: DappChangeStatus.REJECTED });
            const other = await approvedDapp({ ownerEmail: "other@owners.test", auth0ClientId: "client_other" });
            await createDappChange(dataSource.manager, { dappId: other.id });

            const { body } = await review(`${dapp.id}/change/reject`).expect(404);

            expect(body).toEqual({ statusCode: 404, message: "DAPP_CHANGE_NOT_FOUND" });
            expect(await findChanges(dataSource.manager, other.id)).toEqual([expect.objectContaining({ status: "pending" })]);
        });
    });

    describe("requests that overlap", () => {
        it("should keep the client a failed approval stored when an owner edit that read the dApp before it writes after it", async () => {
            const dapp = await pendingDapp();
            duringNextRead(async () => {
                provisioner.script("success").script("failed");
                await review(`${dapp.id}/approve`).expect(500);
            });
            await patch(dapp.id, { name: "Acme Pay" }).expect(200);
            const [clientId] = provisioner.clients.keys();
            const { body } = await review(`${dapp.id}/approve`).expect(200);

            expect(body).toMatchObject({ status: "approved", auth0ClientId: clientId, name: "Acme Pay" });
            expect(provisioner.calls.map((call) => [call.clientId, call.name])).toEqual([
                [undefined, "Acme Wallet"],
                [clientId, "Acme Wallet"],
                [clientId, "Acme Pay"],
            ]);
            expect([...provisioner.clients.keys()]).toEqual([clientId]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "approved",
                auth0ClientId: clientId,
                name: "Acme Pay",
            });
        });

        it("should answer 409 INVALID_TRANSITION to an owner edit that read the dApp pending and writes after its rejection", async () => {
            const dapp = await pendingDapp();
            duringNextRead(() => review(`${dapp.id}/reject`).expect(200));
            const { status, body } = await patch(dapp.id, { name: "Acme Pay" });

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "INVALID_TRANSITION" } });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "rejected", name: "Acme Wallet" });
        });

        it("should answer 409 INVALID_TRANSITION to a rejection that read the dApp pending and writes after its approval", async () => {
            const dapp = await pendingDapp();
            duringNextRead(() => review(`${dapp.id}/approve`).expect(200));
            const { status, body } = await review(`${dapp.id}/reject`);

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "INVALID_TRANSITION" } });
            const [clientId] = provisioner.clients.keys();
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "approved", auth0ClientId: clientId });
            expect(await transitionCounts()).toEqual({ "approve success": 1 });
        });

        it("should answer 409 INVALID_TRANSITION to a change rejection that read the change pending and writes after its approval", async () => {
            const dapp = await approvedDapp();
            const change = await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            duringNextRead(() => review(`${dapp.id}/change/approve`).expect(200), DappChange);
            const { status, body } = await review(`${dapp.id}/change/reject`);

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "INVALID_TRANSITION" } });
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([
                expect.objectContaining({ id: change.id, status: "approved" }),
            ]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Pay" });
            expect(await transitionCounts()).toEqual({ "approveChange success": 1 });
        });

        it("should answer 409 INVALID_TRANSITION to a change approval whose change is rejected while it updates Auth0, which keeps the rejected fields", async () => {
            const dapp = await approvedDapp();
            const change = await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            provisioner.during("update", () => review(`${dapp.id}/change/reject`).expect(200));
            const { status, body } = await review(`${dapp.id}/change/approve`);

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "INVALID_TRANSITION" } });
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([
                expect.objectContaining({ id: change.id, status: "rejected" }),
            ]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Wallet" });
            expect(provisioner.clients.get("client_live")).toMatchObject({ name: "Acme Pay" });
            expect(await transitionCounts()).toEqual({ "rejectChange success": 1 });
        });

        it("should answer 409 INVALID_TRANSITION to a change approval whose change an owner edit replaces while it updates Auth0, which keeps the replaced fields", async () => {
            const dapp = await approvedDapp();
            const change = await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            provisioner.during("update", () => patch(dapp.id, { name: "Acme Cash" }).expect(200));
            const { status, body } = await review(`${dapp.id}/change/approve`);

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "INVALID_TRANSITION" } });
            const changes = await findChanges(dataSource.manager, dapp.id);
            expect(changes).toEqual([expect.objectContaining({ name: "Acme Cash", status: "pending" })]);
            expect(changes[0].id).not.toBe(change.id);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Wallet" });
            expect(provisioner.clients.get("client_live")).toMatchObject({ name: "Acme Pay" });
            expect(await transitionCounts()).toEqual({ "update success": 1 });
        });

        it("should answer 409 INVALID_TRANSITION to a change approval whose change another approval approves while it updates Auth0", async () => {
            const dapp = await approvedDapp();
            const change = await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            provisioner.during("update", () => review(`${dapp.id}/change/approve`).expect(200));
            const { status, body } = await review(`${dapp.id}/change/approve`);

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "INVALID_TRANSITION" } });
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([
                expect.objectContaining({ id: change.id, status: "approved" }),
            ]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Pay" });
            expect(provisioner.calls.map((call) => [call.clientId, call.name])).toEqual([
                ["client_live", "Acme Pay"],
                ["client_live", "Acme Pay"],
            ]);
            expect(await transitionCounts()).toEqual({ "approveChange success": 1 });
        });

        it("should leave the dApp rejected and log the new client when a rejection lands while the approval creates it", async () => {
            const dapp = await pendingDapp();
            const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation();
            let rejection!: { body: { reviewedAt: string } };
            provisioner.during("create", async () => (rejection = await review(`${dapp.id}/reject`).expect(200)));
            const { status, body } = await review(`${dapp.id}/approve`);

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "INVALID_TRANSITION" } });
            const [clientId] = provisioner.clients.keys();
            expect(clientId).toMatch(/^fake_/);
            expect(warn.mock.calls).toEqual([[`Auth0 client ${clientId} of dApp ${dapp.id} is an orphan: the dApp is rejected`]]);
            expect(provisioner.calls.map((call) => call.clientId)).toEqual([undefined]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "rejected",
                auth0ClientId: null,
                reviewedAt: new Date(rejection.body.reviewedAt),
            });
            expect(await transitionCounts()).toEqual({ "reject success": 1 });
        });

        it("should leave the dApp rejected with its client stored when a rejection lands while the approval configures it", async () => {
            const dapp = await pendingDapp();
            let rejection!: { body: { reviewedAt: string } };
            provisioner.during("update", async () => (rejection = await review(`${dapp.id}/reject`).expect(200)));
            const { status, body } = await review(`${dapp.id}/approve`);

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "INVALID_TRANSITION" } });
            const [clientId] = provisioner.clients.keys();
            expect(clientId).toMatch(/^fake_/);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "rejected",
                auth0ClientId: clientId,
                reviewedAt: new Date(rejection.body.reviewedAt),
            });
            expect(await transitionCounts()).toEqual({ "reject success": 1 });
        });

        it("should send Auth0 and keep the fields of an owner edit that lands while the approval creates the client", async () => {
            const dapp = await pendingDapp();
            provisioner.during("create", () => patch(dapp.id, { name: "Acme Pay", webOrigins: ["https://pay.acme.xyz"] }).expect(200));
            const { status, body } = await review(`${dapp.id}/approve`);

            expect(status).toBe(200);
            expect(body).toMatchObject({ status: "approved", name: "Acme Pay", webOrigins: ["https://pay.acme.xyz"] });
            expect(provisioner.calls.map((call) => [call.clientId, call.name, call.webOrigins])).toEqual([
                [undefined, "Acme Wallet", ["https://acme.xyz"]],
                [body.auth0ClientId, "Acme Pay", ["https://pay.acme.xyz"]],
            ]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "approved",
                auth0ClientId: body.auth0ClientId,
                name: "Acme Pay",
                webOrigins: ["https://pay.acme.xyz"],
            });
        });

        it("should answer 409 ORIGIN_TAKEN when an owner edit that lands while the approval creates the client adds an approved dApp's web origin, leaving it pending with its client", async () => {
            await pendingDapp({
                ownerEmail: "first@owners.test",
                status: DappStatus.APPROVED,
                auth0ClientId: "client_first",
                webOrigins: ["https://first.xyz"],
            });
            const dapp = await pendingDapp();
            provisioner.during("create", () => patch(dapp.id, { webOrigins: ["https://acme.xyz", "https://first.xyz"] }).expect(200));
            const { status, body } = await review(`${dapp.id}/approve`);

            expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "ORIGIN_TAKEN" } });
            expect(provisioner.calls.map((call) => [call.clientId, call.webOrigins])).toEqual([[undefined, ["https://acme.xyz"]]]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "pending",
                auth0ClientId: expect.any(String),
                webOrigins: ["https://acme.xyz", "https://first.xyz"],
            });
        });

        it.each<[string, Partial<Dapp>, Record<string, unknown>]>([
            ["a text field", {}, { name: "Acme Pay" }],
            ["a list that grows", {}, { webOrigins: ["https://acme.xyz", "https://pay.acme.xyz"] }],
            ["a list that shrinks", { webOrigins: ["https://acme.xyz", "https://pay.acme.xyz"] }, { webOrigins: ["https://acme.xyz"] }],
            ["a list from empty", {}, { logoutUrls: ["https://acme.xyz/bye"] }],
            ["a list down to empty", { logoutUrls: ["https://acme.xyz/bye"] }, { logoutUrls: [] }],
        ])(
            "should answer 409 INVALID_TRANSITION to an approval when an owner edit of %s lands while it configures the client, and send the edit when approved again",
            async (_case, stored, edit) => {
                const dapp = await pendingDapp(stored);
                provisioner.during("update", () => patch(dapp.id, edit).expect(200));
                const { status, body } = await review(`${dapp.id}/approve`);

                expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "INVALID_TRANSITION" } });
                const [clientId] = provisioner.clients.keys();
                expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                    ...edit,
                    status: "pending",
                    auth0ClientId: clientId,
                    reviewedAt: null,
                });
                expect(await transitionCounts()).toEqual({ "update success": 1 });

                const retried = await review(`${dapp.id}/approve`).expect(200);

                expect(retried.body).toMatchObject({ ...edit, status: "approved", auth0ClientId: clientId });
                expect(provisioner.clients.get(clientId)).toMatchObject(edit);
                expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ ...edit, status: "approved" });
            },
        );

        it.each<[string, Partial<Dapp>]>([
            ["the contact email", { contactEmail: "ops@acme.xyz" }],
            ["the MAU bracket", { mauBracket: MauBracket.GT_25K }],
        ])(
            "should answer 409 INVALID_TRANSITION to an approval when an owner edit of %s, which Auth0 does not get, lands while it configures the client",
            async (_case, edit) => {
                const dapp = await pendingDapp();
                provisioner.during("update", () => patch(dapp.id, edit).expect(200));
                const { status, body } = await review(`${dapp.id}/approve`);

                expect({ status, body }).toEqual({ status: 409, body: { statusCode: 409, message: "INVALID_TRANSITION" } });
                expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ ...edit, status: "pending", reviewedAt: null });

                const retried = await review(`${dapp.id}/approve`).expect(200);

                expect(retried.body).toMatchObject({ ...edit, status: "approved" });
            },
        );

        it("should approve with the client another approval stored first and log its own as an orphan", async () => {
            const dapp = await pendingDapp();
            const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation();
            provisioner.script("success").script("success").script("failed");
            provisioner.during("create", () => review(`${dapp.id}/approve`).expect(500));
            const { status, body } = await review(`${dapp.id}/approve`);
            const [storedId] = provisioner.clients.keys();

            expect(status).toBe(200);
            expect(body).toMatchObject({ status: "approved", auth0ClientId: storedId });
            const [, orphanId] = provisioner.clients.keys();
            expect(orphanId).toMatch(/^fake_/);
            expect(warn.mock.calls).toEqual([
                [`Auth0 client ${orphanId} of dApp ${dapp.id} is an orphan: the dApp already has the client ${storedId}`],
            ]);
            expect(provisioner.calls.map((call) => call.clientId)).toEqual([undefined, undefined, storedId, storedId]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "approved", auth0ClientId: storedId });
        });
    });

    describe("access", () => {
        it.each(["approve", "reject", "change/approve", "change/reject"])(
            "should refuse POST /dapp/:id/%s to a non-admin with 403 FORBIDDEN_ROLE and without a token with 401 UNAUTHENTICATED",
            async (action) => {
                const dapp = await pendingDapp();

                const forbidden = await testApp.request
                    .post(`/dapp/${dapp.id}/${action}`)
                    .set("Authorization", await bearer(ownerEmail))
                    .expect(403);
                const anonymous = await testApp.request.post(`/dapp/${dapp.id}/${action}`).expect(401);

                expect(forbidden.body).toEqual({ statusCode: 403, message: "FORBIDDEN_ROLE" });
                expect(anonymous.body).toEqual({ statusCode: 401, message: "UNAUTHENTICATED" });
                expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "pending" });
            },
        );

        it.each(["not-a-uuid/approve", "not-a-uuid/reject", "not-a-uuid/change/approve", "not-a-uuid/change/reject"])(
            "should answer 400 for POST /dapp/%s",
            async (path) => {
                await review(path).expect(400);
            },
        );
    });
});
