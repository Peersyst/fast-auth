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
import { testConfig } from "../../mocks/config/config.mock";
import { dappForm, findDapp, transitionCounts } from "../../mocks/dapp/dapp.mock";
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
        provisioner.reset();
        slack.clearMocks();
        register.resetMetrics();
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
     * Sends a review action as the admin.
     * @param path The route under /dapp.
     * @returns The pending request.
     */
    const review = (path: string) => testApp.request.post(`/dapp/${path}`).set("Authorization", admin);

    describe("POST /dapp/:id/approve", () => {
        it("should create the Auth0 client, approve the dApp and clear its recorded Auth0 error", async () => {
            const dapp = await pendingDapp({ auth0Error: "Fake create: scripted failed" });

            const { body } = await review(`${dapp.id}/approve`).expect(200);

            expect(body).toEqual({
                id: dapp.id,
                ownerEmail,
                ...dappForm(),
                status: "approved",
                auth0ClientId: expect.stringMatching(/^fake_/),
                auth0Error: null,
                reviewedAt: expect.any(String),
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
                auth0Error: null,
                reviewedAt: new Date(body.reviewedAt),
            });
            expect(slack.notify).not.toHaveBeenCalled();
            expect(await transitionCounts()).toEqual({ "approve success": 1 });
        });

        it("should keep the dApp pending when Auth0 fails, answer 200 with the error and alert the admins", async () => {
            const dapp = await pendingDapp();
            provisioner.script("failed");

            const { body } = await review(`${dapp.id}/approve`).expect(200);

            expect(body).toMatchObject({
                status: "pending",
                auth0ClientId: null,
                auth0Error: "Fake create: scripted failed",
                reviewedAt: null,
            });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                status: "pending",
                auth0ClientId: null,
                auth0Error: "Fake create: scripted failed",
                reviewedAt: null,
            });
            expect(slack.notify).toHaveBeenCalledWith({
                kind: "auth0_failed",
                dapp: expect.objectContaining({ id: dapp.id }),
                error: "Fake create: scripted failed",
            });
            expect(await transitionCounts()).toEqual({ "approve success": 1 });
        });

        it.each([DappStatus.APPROVED, DappStatus.REJECTED])("should answer 409 INVALID_TRANSITION for a %s dApp", async (status) => {
            const dapp = await pendingDapp({ status });

            const { body } = await review(`${dapp.id}/approve`).expect(409);

            expect(body).toEqual({ statusCode: 409, message: "INVALID_TRANSITION" });
            expect(provisioner.calls).toEqual([]);
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ status });
            expect(await transitionCounts()).toEqual({ "approve INVALID_TRANSITION": 1 });
        });

        it("should answer 404 DAPP_NOT_FOUND for an unknown id", async () => {
            const { body } = await review(`${unknownId}/approve`).expect(404);

            expect(body).toEqual({ statusCode: 404, message: "DAPP_NOT_FOUND" });
            expect(await transitionCounts()).toEqual({ "approve DAPP_NOT_FOUND": 1 });
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
                auth0Error: null,
                reviewedAt: expect.any(String),
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
            expect(await transitionCounts()).toEqual({ "reject INVALID_TRANSITION": 1, "reject DAPP_NOT_FOUND": 1 });
        });
    });

    describe("access", () => {
        it.each(["approve", "reject"])(
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
                expect(await transitionCounts()).toEqual({});
            },
        );

        it.each(["not-a-uuid/approve", "not-a-uuid/reject"])("should answer 400 for POST /dapp/%s", async (path) => {
            await review(path).expect(400);
        });
    });
});
