import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { DappEvent } from "@database/console/entities";
import { createDapp } from "@database/console/test/factories";
import { DappEventType, DappStatus } from "@shared/modules/dapp";
import { DappModule } from "../../../src/modules/dapp/dapp.module";
import { SettingModule } from "../../../src/modules/setting/setting.module";
import { SettingService } from "../../../src/modules/setting/setting.service";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { adminBearer, bearer, testKeySet } from "../../mocks/auth/token.mock";
import { testConfig } from "../../mocks/config/config.mock";
import { dappForm, eventTypes, findDapp } from "../../mocks/dapp/dapp.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";

describe("SettingModule (integration)", () => {
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
                SettingModule,
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
        setAutoApproval(false);
        provisioner.reset();
        slack.clearMocks();
        admin = await adminBearer();
    });

    /**
     * Turns auto-approval on or off.
     * @param enabled Whether it is on.
     */
    const setAutoApproval = (enabled: boolean): void => {
        testApp.module.get(SettingService).update({ autoApproval: { enabled } });
    };

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

    describe("GET /admin/settings", () => {
        it("should answer auto-approval off by default", async () => {
            const { body } = await testApp.request.get("/admin/settings").set("Authorization", admin).expect(200);

            expect(body).toEqual({ autoApproval: { enabled: false } });
        });

        it("should refuse a user with 403 FORBIDDEN_ROLE", async () => {
            const { body } = await testApp.request
                .get("/admin/settings")
                .set("Authorization", await bearer("bob@owners.test"))
                .expect(403);

            expect(body).toMatchObject({ message: "FORBIDDEN_ROLE" });
        });
    });

    describe("PUT /admin/settings", () => {
        it("should store the switch", async () => {
            const { body } = await testApp.request
                .put("/admin/settings")
                .set("Authorization", admin)
                .send({ autoApproval: { enabled: true } })
                .expect(200);

            expect(body).toEqual({ autoApproval: { enabled: true } });
            const { body: stored } = await testApp.request.get("/admin/settings").set("Authorization", admin).expect(200);
            expect(stored).toEqual({ autoApproval: { enabled: true } });
        });

        it("should refuse a malformed body with 400", async () => {
            await testApp.request
                .put("/admin/settings")
                .set("Authorization", admin)
                .send({ autoApproval: { enabled: "yes" } })
                .expect(400);
        });
    });

    describe("auto-approval on submit", () => {
        it("should approve a new owner's submission as the system: client created and Slack alerted", async () => {
            setAutoApproval(true);

            const { body } = await submit();

            expect(body).toMatchObject({ status: "approved", auth0ClientId: expect.stringMatching(/^fake_/) });
            expect(await findDapp(dataSource.manager, body.id)).toMatchObject({ reviewedAt: expect.any(Date) });
            expect(await eventTypes(dataSource.manager, body.id)).toEqual(["submitted", "auto_approved", "auth0_created"]);
            expect(slack.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "auto_approved" }));
        });

        it("should send a submission to review when auto-approval is off", async () => {
            const { body } = await submit();

            expect(body.status).toBe("pending");
            const submitted = await dataSource.manager.findOneByOrFail(DappEvent, { dappId: body.id, type: DappEventType.SUBMITTED });
            expect(submitted.details).toEqual({ chosenForAutoApproval: false });
        });

        it("should send a submission to review when its owner had an earlier dApp, whatever its status", async () => {
            setAutoApproval(true);
            await createDapp(dataSource.manager, { ownerEmail: "again@owners.test", status: DappStatus.REMOVED });

            const { body } = await submit("Again@Owners.test");

            expect(body.status).toBe("pending");
        });

        it("should keep a chosen submission pending when Auth0 fails, answer 201, and alert the admins as usual", async () => {
            setAutoApproval(true);
            provisioner.script("createClient", "failed");

            const { body } = await submit();

            expect(body).toMatchObject({ status: "pending", auth0ClientId: null });
            expect(await eventTypes(dataSource.manager, body.id)).toEqual(["submitted", "auth0_failed"]);
            expect(slack.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "submitted" }));
            const submitted = await dataSource.manager.findOneByOrFail(DappEvent, { dappId: body.id, type: DappEventType.SUBMITTED });
            expect(submitted.details).toEqual({ chosenForAutoApproval: true });
        });

        it("should leave dApps already pending alone when auto-approval is turned on", async () => {
            const pending = await submit("waiting@owners.test");

            await testApp.request
                .put("/admin/settings")
                .set("Authorization", admin)
                .send({ autoApproval: { enabled: true } })
                .expect(200);

            expect(await findDapp(dataSource.manager, pending.body.id)).toMatchObject({ status: "pending" });
        });
    });
});
