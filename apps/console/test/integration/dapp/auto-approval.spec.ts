import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { register } from "prom-client";
import { DataSource } from "typeorm";
import { DappModule } from "../../../src/modules/dapp/dapp.module";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { bearer, testKeySet } from "../../mocks/auth/token.mock";
import { testConfig } from "../../mocks/config/config.mock";
import { dappForm, findDapp, transitionCounts } from "../../mocks/dapp/dapp.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";

describe("Auto-approval (integration)", () => {
    const ownerEmail = "new@owners.test";
    const provisioner = new FakeProvisionerMock();
    const slack = new SlackNotifierMock();
    let testApp: TestApp;
    let dataSource: DataSource;
    let owner: string;

    beforeAll(async () => {
        const config = testConfig();
        testApp = await createTestApp({
            imports: [
                ConfigModule.forRoot({
                    load: [() => ({ ...config, admin: { ...config.admin, autoApprovalEnabled: true } })],
                    isGlobal: true,
                }),
                TypeOrmModule.forRoot(config.database),
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
    });

    describe("POST /dapp", () => {
        it("should approve a new dApp with a new Auth0 client and alert the admins", async () => {
            const { body } = await testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()).expect(201);

            expect(body).toMatchObject({
                status: "approved",
                auth0ClientId: expect.stringMatching(/^fake_/),
                reviewedAt: expect.any(String),
            });
            expect(provisioner.calls).toEqual([
                {
                    dappId: body.id,
                    name: "Acme Wallet",
                    description: "A wallet for NEAR.",
                    logoUrl: "https://cdn.acme.xyz/logo.png",
                    callbackUrls: ["https://acme.xyz/callback"],
                    logoutUrls: [],
                    webOrigins: ["https://acme.xyz"],
                },
            ]);
            expect(await findDapp(dataSource.manager, body.id)).toMatchObject({
                status: "approved",
                auth0ClientId: body.auth0ClientId,
                reviewedAt: new Date(body.reviewedAt),
            });
            expect(slack.notify).toHaveBeenCalledWith({
                kind: "auto_approved",
                dapp: expect.objectContaining({ id: body.id, status: "approved", auth0ClientId: body.auth0ClientId }),
            });
            expect(await transitionCounts()).toEqual({ "create success": 1, "autoApprove success": 1 });
        });

        it("should keep the dApp pending when Auth0 fails, answer 201, record the error and alert the admins", async () => {
            provisioner.script("failed");

            const { body } = await testApp.request.post("/dapp").set("Authorization", owner).send(dappForm()).expect(201);

            expect(body).toMatchObject({ status: "pending", auth0ClientId: null, reviewedAt: null });
            expect(await findDapp(dataSource.manager, body.id)).toMatchObject({
                status: "pending",
                auth0Error: "Fake create: scripted failed",
                reviewedAt: null,
            });
            expect(slack.notify).toHaveBeenCalledWith({
                kind: "auth0_failed",
                dapp: expect.objectContaining({ id: body.id }),
                error: "Fake create: scripted failed",
            });
            expect(await transitionCounts()).toEqual({ "create success": 1, "autoApprove error": 1 });
        });
    });
});
