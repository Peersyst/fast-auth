import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { register } from "prom-client";
import { DataSource } from "typeorm";
import { Dapp } from "@database/console/entities";
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

    describe("POST /dapp/:id/approve", () => {
        it("should create the Auth0 client and approve the dApp", async () => {
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
            ]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "approved",
                auth0ClientId: body.auth0ClientId,
                reviewedAt: new Date(body.reviewedAt),
            });
            expect(slack.notify).not.toHaveBeenCalled();
            expect(await transitionCounts()).toEqual({ "approve success": 1 });
        });

        it("should leave the dApp pending when the Auth0 call fails", async () => {
            const dapp = await pendingDapp();
            provisioner.script("failed");

            await review(`${dapp.id}/approve`).expect(500);

            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "pending",
                auth0ClientId: null,
                reviewedAt: null,
            });
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

        it("should apply a contact email and MAU change without calling Auth0", async () => {
            const dapp = await approvedDapp();
            await createDappChange(dataSource.manager, {
                dappId: dapp.id,
                name: null,
                contactEmail: "ops@acme.xyz",
                mauBracket: MauBracket.GT_25K,
            });

            const { body } = await review(`${dapp.id}/change/approve`).expect(200);

            expect(body).toMatchObject({ name: "Acme Wallet", contactEmail: "ops@acme.xyz", mauBracket: "gt25k", pendingChange: null });
            expect(provisioner.calls).toEqual([]);
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
