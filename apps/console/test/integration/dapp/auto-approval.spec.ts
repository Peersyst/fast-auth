import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { DappEvent } from "@database/console/entities";
import { createDapp } from "@database/console/test/factories";
import { DappEventType, DappStatus } from "@shared/modules/dapp";
import { DappModule } from "../../../src/modules/dapp/dapp.module";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { bearer, testKeySet } from "../../mocks/auth/token.mock";
import { testConfig } from "../../mocks/config/config.mock";
import { dappForm, eventTypes, findDapp } from "../../mocks/dapp/dapp.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";

describe("Auto-approval (integration)", () => {
    const provisioner = new FakeProvisionerMock();
    const slack = new SlackNotifierMock();
    let testApp: TestApp;
    let dataSource: DataSource;

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
    });

    /**
     * Submits the form as a new owner, expecting 201.
     * @param email The owner's email.
     * @returns The response.
     */
    const submit = async (email = "new@owners.test") =>
        testApp.request
            .post("/dapp")
            .set("Authorization", await bearer(email))
            .send(dappForm())
            .expect(201);

    it("should approve a new owner's submission as the system: client created and Slack alerted", async () => {
        const { body } = await submit();

        expect(body).toMatchObject({ status: "approved", auth0ClientId: expect.stringMatching(/^fake_/) });
        expect(await findDapp(dataSource.manager, body.id)).toMatchObject({ reviewedAt: expect.any(Date) });
        expect(await eventTypes(dataSource.manager, body.id)).toEqual(["submitted", "auto_approved", "auth0_created"]);
        expect(slack.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "auto_approved" }));
    });

    it("should send a submission to review when its owner had an earlier dApp, whatever its status", async () => {
        await createDapp(dataSource.manager, { ownerEmail: "again@owners.test", status: DappStatus.REMOVED });

        const { body } = await submit("Again@Owners.test");

        expect(body.status).toBe("pending");
    });

    it("should keep a chosen submission pending when Auth0 fails, answer 201, and alert the admins as usual", async () => {
        provisioner.script("createClient", "failed");

        const { body } = await submit();

        expect(body).toMatchObject({ status: "pending", auth0ClientId: null });
        expect(await eventTypes(dataSource.manager, body.id)).toEqual(["submitted", "auth0_failed"]);
        expect(slack.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "submitted" }));
        const submitted = await dataSource.manager.findOneByOrFail(DappEvent, { dappId: body.id, type: DappEventType.SUBMITTED });
        expect(submitted.details).toEqual({ chosenForAutoApproval: true });
    });
});
