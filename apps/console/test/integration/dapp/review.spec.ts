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

    /**
     * Tells whether Postgres reports a request of this database waiting on a lock.
     * @returns Whether one waits.
     */
    const someRequestWaitsOnALock = async (): Promise<boolean> => {
        const waiting: unknown[] = await dataSource.query(
            "SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'",
        );
        return waiting.length > 0;
    };

    /**
     * Starts another request when the next write of an entity is about to run. The write goes on once Postgres reports that
     * request waiting on a lock, or once it answers without having waited, and fails when neither happens in time.
     * @param run The request to start.
     * @param write The write that triggers it. Defaults to a delete.
     * @param entity The entity whose write triggers it. Defaults to any.
     * @returns What the request answers, and whether it waited on a lock.
     */
    const duringNextWrite = <T>(
        run: () => PromiseLike<T>,
        write: "delete" | "update" = "delete",
        entity?: EntityTarget<unknown>,
    ): Promise<{ response: T; waited: boolean }> =>
        new Promise((started, failed) => {
            const original = EntityManager.prototype[write] as (...args: unknown[]) => Promise<never>;
            let pending = true;
            jest.spyOn(EntityManager.prototype, write).mockImplementation(async function (this: EntityManager, ...args: unknown[]) {
                if (!pending || (entity !== undefined && args[0] !== entity)) return original.apply(this, args);
                pending = false;
                let answered = false;
                const answer = Promise.resolve(run()).finally(() => (answered = true));
                const deadline = Date.now() + 5000;
                let waited = false;
                while (!answered && !(waited = await someRequestWaitsOnALock())) {
                    if (Date.now() > deadline) {
                        const error = new Error("The other request neither waited on a lock nor answered in 5 s");
                        failed(error);
                        throw error;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 10));
                }
                started(answer.then((response) => ({ response, waited })));
                return original.apply(this, args);
            });
        });

    /**
     * Sends a DELETE to the dApp as the admin.
     * @param id The dApp id.
     * @returns The pending request.
     */
    const remove = (id: string) => testApp.request.delete(`/dapp/${id}`).set("Authorization", admin);

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

        it("should answer 404 DAPP_NOT_FOUND and log the new client as an orphan when the dApp is deleted while the approval creates it", async () => {
            const dapp = await pendingDapp();
            const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation();
            provisioner.during("create", () => remove(dapp.id).expect(204));
            const { status, body } = await review(`${dapp.id}/approve`);

            expect({ status, body }).toEqual({ status: 404, body: { statusCode: 404, message: "DAPP_NOT_FOUND" } });
            const [clientId] = provisioner.clients.keys();
            expect(clientId).toMatch(/^fake_/);
            expect(warn.mock.calls).toEqual([[`Auth0 client ${clientId} of dApp ${dapp.id} is an orphan: the dApp is deleted`]]);
            expect(slack.notify).toHaveBeenCalledWith({
                kind: "dapp_deleted",
                dapp: expect.objectContaining({ id: dapp.id, auth0ClientId: null }),
                deletedBy: "admin",
            });
            expect(await dataSource.manager.countBy(Dapp, { id: dapp.id })).toBe(0);
            expect(await transitionCounts()).toEqual({ "delete success": 1 });
        });

        it("should alert the client stored when the dApp is deleted, logging as an orphan the one an approval creates meanwhile", async () => {
            const dapp = await pendingDapp();
            const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation();
            const approval = duringNextWrite(() => review(`${dapp.id}/approve`));
            await remove(dapp.id).expect(204);
            const { response, waited } = await approval;

            expect(waited).toBe(true);
            expect({ status: response.status, body: response.body }).toEqual({
                status: 404,
                body: { statusCode: 404, message: "DAPP_NOT_FOUND" },
            });
            const [clientId] = provisioner.clients.keys();
            expect(warn.mock.calls).toEqual([[`Auth0 client ${clientId} of dApp ${dapp.id} is an orphan: the dApp is deleted`]]);
            expect(slack.notify).toHaveBeenCalledTimes(1);
            expect(slack.notify).toHaveBeenCalledWith({
                kind: "dapp_deleted",
                dapp: expect.objectContaining({ id: dapp.id, auth0ClientId: null }),
                deletedBy: "admin",
            });
        });

        it("should answer one of two overlapping deletes 204 and alert once, and the other 404 DAPP_NOT_FOUND", async () => {
            const dapp = await pendingDapp();
            const second = duringNextWrite(() => remove(dapp.id));
            const first = await remove(dapp.id);
            const { response, waited } = await second;

            expect(waited).toBe(true);
            expect([first.status, response.status]).toEqual([204, 404]);
            expect(slack.notify).toHaveBeenCalledTimes(1);
            expect(await transitionCounts()).toEqual({ "delete success": 1 });
        });

        it("should answer 404 DAPP_NOT_FOUND to an approval whose dApp is deleted while it configures the client, which the alert names", async () => {
            const dapp = await pendingDapp();
            provisioner.during("update", () => remove(dapp.id).expect(204));
            const { status, body } = await review(`${dapp.id}/approve`);

            expect({ status, body }).toEqual({ status: 404, body: { statusCode: 404, message: "DAPP_NOT_FOUND" } });
            const [clientId] = provisioner.clients.keys();
            expect(slack.notify).toHaveBeenCalledWith({
                kind: "dapp_deleted",
                dapp: expect.objectContaining({ id: dapp.id, auth0ClientId: clientId }),
                deletedBy: "admin",
            });
            expect(await transitionCounts()).toEqual({ "delete success": 1 });
        });

        it("should answer 404 DAPP_NOT_FOUND to a rejection and an owner edit that read the dApp pending and write after its deletion", async () => {
            const rejected = await pendingDapp();
            duringNextRead(() => remove(rejected.id).expect(204));
            const rejection = await review(`${rejected.id}/reject`);
            const edited = await pendingDapp();
            duringNextRead(() => remove(edited.id).expect(204));
            const edit = await patch(edited.id, { name: "Acme Pay" });

            expect([rejection, edit].map(({ status, body }) => ({ status, body }))).toEqual([
                { status: 404, body: { statusCode: 404, message: "DAPP_NOT_FOUND" } },
                { status: 404, body: { statusCode: 404, message: "DAPP_NOT_FOUND" } },
            ]);
            expect(await transitionCounts()).toEqual({ "delete success": 2 });
        });

        it("should answer 404 DAPP_NOT_FOUND to a change approval whose dApp is deleted while it updates Auth0", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            provisioner.during("update", () => remove(dapp.id).expect(204));
            const { status, body } = await review(`${dapp.id}/change/approve`);

            expect({ status, body }).toEqual({ status: 404, body: { statusCode: 404, message: "DAPP_NOT_FOUND" } });
            expect(await dataSource.manager.countBy(Dapp, { id: dapp.id })).toBe(0);
            expect(await transitionCounts()).toEqual({ "delete success": 1 });
        });

        it("should apply the change and then delete the dApp when a delete starts while a change approval writes", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            const deletion = duringNextWrite(() => remove(dapp.id), "update", Dapp);
            const { status, body } = await review(`${dapp.id}/change/approve`);
            const { response, waited } = await deletion;

            expect(waited).toBe(true);
            expect({ status, name: body.name, deleted: response.status }).toEqual({ status: 200, name: "Acme Pay", deleted: 204 });
            expect(await dataSource.manager.countBy(Dapp, { id: dapp.id })).toBe(0);
            expect(await transitionCounts()).toEqual({ "approveChange success": 1, "delete success": 1 });
        });

        it("should answer 404 DAPP_NOT_FOUND to an owner edit that read the dApp approved and writes after its deletion", async () => {
            const dapp = await approvedDapp();
            duringNextRead(() => remove(dapp.id).expect(204));
            const { status, body } = await patch(dapp.id, { name: "Acme Pay" });

            expect({ status, body }).toEqual({ status: 404, body: { statusCode: 404, message: "DAPP_NOT_FOUND" } });
            expect(slack.notify.mock.calls.map(([alert]) => alert.kind)).toEqual(["dapp_deleted"]);
            expect(await transitionCounts()).toEqual({ "delete success": 1 });
        });

        it("should store the change and then delete the dApp when a delete starts while an owner edit replaces the pending change", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            const deletion = duringNextWrite(() => remove(dapp.id));
            const { status, body } = await patch(dapp.id, { name: "Acme Cash" });
            const { response, waited } = await deletion;

            expect(waited).toBe(true);
            expect({ status, change: body.pendingChange?.name, deleted: response.status }).toEqual({
                status: 200,
                change: "Acme Cash",
                deleted: 204,
            });
            expect(await dataSource.manager.countBy(Dapp, { id: dapp.id })).toBe(0);
            expect(await findChanges(dataSource.manager, dapp.id)).toEqual([]);
        });

        it("should compare an owner edit with the live values a change approval applied after the edit read the dApp", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            duringNextRead(() => review(`${dapp.id}/change/approve`).expect(200));
            const { status, body } = await patch(dapp.id, { name: "Acme Wallet", description: "Fresh description" });

            expect({ status, name: body.name, description: body.description }).toEqual({
                status: 200,
                name: "Acme Pay",
                description: "A wallet for NEAR.",
            });
            expect(body.pendingChange).toMatchObject({ name: "Acme Wallet", description: "Fresh description" });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ name: "Acme Pay", description: "A wallet for NEAR." });
            expect(
                (await findChanges(dataSource.manager, dapp.id)).map(({ status, name, description }) => ({ status, name, description })),
            ).toEqual([
                { status: "approved", name: "Acme Pay", description: null },
                { status: "pending", name: "Acme Wallet", description: "Fresh description" },
            ]);
            expect(slack.notify.mock.calls.map(([alert]) => alert)).toEqual([
                expect.objectContaining({
                    kind: "change_requested",
                    change: { name: "Acme Wallet", description: "Fresh description" },
                }),
            ]);
        });

        it("should store as a change the values an owner edit puts back when a change approval replaced them after the edit read the dApp", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            duringNextRead(() => review(`${dapp.id}/change/approve`).expect(200));
            const { status, body } = await patch(dapp.id, { name: "Acme Wallet" });

            expect({ status, name: body.name, change: body.pendingChange?.name }).toEqual({
                status: 200,
                name: "Acme Pay",
                change: "Acme Wallet",
            });
            expect((await findChanges(dataSource.manager, dapp.id)).map(({ status, name }) => ({ status, name }))).toEqual([
                { status: "approved", name: "Acme Pay" },
                { status: "pending", name: "Acme Wallet" },
            ]);
        });

        it("should make the second of two overlapping owner edits wait for the first and replace its pending change", async () => {
            const dapp = await approvedDapp();
            const second = duringNextWrite(() => patch(dapp.id, { description: "Second description" }));
            const first = await patch(dapp.id, { name: "Acme Pay" });
            const { response, waited } = await second;

            expect(waited).toBe(true);
            expect({ first: first.status, second: response.status }).toEqual({ first: 200, second: 200 });
            expect(
                (await findChanges(dataSource.manager, dapp.id)).map(({ status, name, description }) => ({ status, name, description })),
            ).toEqual([{ status: "pending", name: null, description: "Second description" }]);
        });

        it("should answer 404 DAPP_NOT_FOUND to a change rejection that read the change pending and writes after the dApp's deletion", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, { dappId: dapp.id, name: "Acme Pay" });
            duringNextRead(() => remove(dapp.id).expect(204), DappChange);
            const { status, body } = await review(`${dapp.id}/change/reject`);

            expect({ status, body }).toEqual({ status: 404, body: { statusCode: 404, message: "DAPP_NOT_FOUND" } });
            expect(await transitionCounts()).toEqual({ "delete success": 1 });
        });

        it("should answer 404 DAPP_NOT_FOUND to a resubmission that read the dApp rejected and writes after its deletion, leaving it deleted", async () => {
            const dapp = await pendingDapp({ status: DappStatus.REJECTED, reviewedAt: new Date("2026-01-02T00:00:00Z") });
            duringNextRead(() => remove(dapp.id).expect(204));
            const { status, body } = await patch(dapp.id, { name: "Acme Pay" });

            expect({ status, body }).toEqual({ status: 404, body: { statusCode: 404, message: "DAPP_NOT_FOUND" } });
            expect(await dataSource.manager.countBy(Dapp, { id: dapp.id })).toBe(0);
            expect(slack.notify.mock.calls.map(([alert]) => alert.kind)).toEqual(["dapp_deleted"]);
            expect(await transitionCounts()).toEqual({ "delete success": 1 });
        });

        it("should answer 409 INVALID_TRANSITION to a resubmission that read the dApp rejected and writes after another resubmission", async () => {
            const dapp = await pendingDapp({ status: DappStatus.REJECTED, reviewedAt: new Date("2026-01-02T00:00:00Z") });
            let second!: { status: number; body: unknown };
            duringNextRead(async () => {
                const { status, body } = await patch(dapp.id, { name: "Acme Pay" });
                second = { status, body };
            });
            const first = await patch(dapp.id, { name: "Acme Cash" });

            expect({ status: first.status, body: first.body }).toEqual({
                status: 409,
                body: { statusCode: 409, message: "INVALID_TRANSITION" },
            });
            expect(second.status).toBe(200);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status: "pending", name: "Acme Pay", reviewedAt: null });
            expect(slack.notify.mock.calls.map(([alert]) => alert.kind)).toEqual(["dapp_submitted"]);
            expect(await transitionCounts()).toEqual({ "update success": 1 });
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
