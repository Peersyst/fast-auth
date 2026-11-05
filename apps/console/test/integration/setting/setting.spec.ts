import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Dapp, SettingEvent } from "@database/console/entities";
import { createAutoApprovalSetting, createDapp, createDappEvent } from "@database/console/test/factories";
import { ActorRole, DappEventType, DappStatus, EmailTemplate } from "@shared/modules/dapp";
import { DappModule } from "../../../src/modules/dapp/dapp.module";
import { SettingModule } from "../../../src/modules/setting/setting.module";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { EMAILER, SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { adminBearer, bearer, rotateBearerSubjects, testKeySet } from "../../mocks/auth/token.mock";
import { ADMIN_EMAIL, testConfig } from "../../mocks/config/config.mock";
import { dappForm, eventTypes, findDapp } from "../../mocks/dapp/dapp.mock";
import { EmailerMock } from "../../mocks/notification/emailer.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";
import { BUSINESS_EXCEPTION_FILTER } from "../../../src/modules/common/exception/business-exception.filter";

describe("SettingModule (integration)", () => {
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
                DappModule,
                SettingModule,
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
     * Turns auto-approval on or off in storage.
     * @param enabled Whether it is on.
     * @returns The stored setting.
     */
    const setAutoApproval = (enabled: boolean): Promise<unknown> => createAutoApprovalSetting(dataSource.manager, enabled);

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
        it("should answer auto-approval off by default with the configured daily cap", async () => {
            const { body } = await testApp.request.get("/admin/settings").set("Authorization", admin).expect(200);

            expect(body).toEqual({ autoApproval: { enabled: false, dailyCap: 10 } });
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
        it("should store the switch and record the change with the old value, the new value and the admin", async () => {
            const { body } = await testApp.request
                .put("/admin/settings")
                .set("Authorization", admin)
                .send({ autoApproval: { enabled: true } })
                .expect(200);

            expect(body).toEqual({ autoApproval: { enabled: true, dailyCap: 10 } });
            expect(await dataSource.manager.find(SettingEvent)).toEqual([
                expect.objectContaining({
                    key: "auto_approval",
                    oldValue: { enabled: false },
                    newValue: { enabled: true },
                    actorEmail: ADMIN_EMAIL,
                }),
            ]);
        });

        it("should record nothing for a PUT that changes nothing", async () => {
            await testApp.request
                .put("/admin/settings")
                .set("Authorization", admin)
                .send({ autoApproval: { enabled: false } })
                .expect(200);

            expect(await dataSource.manager.count(SettingEvent)).toBe(0);
        });

        it("should refuse a malformed body with 400 VALIDATION_FAILED naming the field", async () => {
            const { body } = await testApp.request
                .put("/admin/settings")
                .set("Authorization", admin)
                .send({ autoApproval: { enabled: "yes" } })
                .expect(400);

            expect(body).toEqual({ statusCode: 400, message: "VALIDATION_FAILED", fields: ["autoApproval.enabled"] });
        });
    });

    describe("auto-approval on submit", () => {
        it("should approve a new owner's submission as the system: client created, owner and admins emailed, Slack alerted", async () => {
            await setAutoApproval(true);

            const { body } = await submit();

            expect(body).toMatchObject({ status: "approved", auth0ClientId: expect.stringMatching(/^fake_/) });
            expect(await findDapp(dataSource.manager, body.id)).toMatchObject({ reviewedBy: null, reviewedAt: expect.any(Date) });
            expect(await eventTypes(dataSource.manager, body.id)).toEqual([
                "submitted",
                "auto_approved",
                "auth0_created",
                "email_sent",
                "email_sent",
            ]);
            expect(emailer.send.mock.calls.map(([email]) => [email.template, email.to])).toEqual([
                [EmailTemplate.DAPP_APPROVED, "new@owners.test"],
                [EmailTemplate.ADMIN_ALERT, [ADMIN_EMAIL]],
            ]);
            expect(emailer.send).toHaveBeenCalledWith(expect.objectContaining({ kind: "auto_approved" }));
            expect(slack.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "auto_approved" }));
        });

        it("should send a submission to review when auto-approval is off", async () => {
            const { body } = await submit();

            expect(body.status).toBe("pending");
            const [submitted] = await dataSource.query(`SELECT details FROM dapp_event WHERE dapp_id = $1 AND type = 'submitted'`, [
                body.id,
            ]);
            expect(submitted.details).toEqual({ chosenForAutoApproval: false });
        });

        it("should send a submission to review when its owner had an earlier dApp, whatever its status", async () => {
            await setAutoApproval(true);
            await createDapp(dataSource.manager, { ownerEmail: "again@owners.test", status: DappStatus.REMOVED });

            const { body } = await submit("Again@Owners.test");

            expect(body.status).toBe("pending");
        });

        it("should send a submission to review when its owner acted as the user on a dApp moved to someone else", async () => {
            await setAutoApproval(true);
            const handedOver = await createDapp(dataSource.manager, { ownerEmail: "other@owners.test" });
            await createDappEvent(dataSource.manager, {
                dappId: handedOver.id,
                actorEmail: "former@owners.test",
                actorRole: ActorRole.USER,
            });

            const { body } = await submit("former@owners.test");

            expect(body.status).toBe("pending");
        });

        it("should send a submission to review once the rolling daily cap is reached", async () => {
            await setAutoApproval(true);
            const earlier = await createDapp(dataSource.manager, { ownerEmail: "earlier@owners.test" });
            for (let n = 0; n < 10; n += 1) {
                await createDappEvent(dataSource.manager, {
                    dappId: earlier.id,
                    type: DappEventType.SUBMITTED,
                    actorEmail: `earlier-${n}@owners.test`,
                    actorRole: ActorRole.SYSTEM,
                    details: { chosenForAutoApproval: true },
                });
            }

            const { body } = await submit();

            expect(body.status).toBe("pending");
        });

        it("should not count choices older than 24 hours against the cap", async () => {
            await setAutoApproval(true);
            const earlier = await createDapp(dataSource.manager, { ownerEmail: "earlier@owners.test" });
            for (let n = 0; n < 10; n += 1) {
                await createDappEvent(dataSource.manager, {
                    dappId: earlier.id,
                    actorRole: ActorRole.SYSTEM,
                    details: { chosenForAutoApproval: true },
                    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
                });
            }

            const { body } = await submit();

            expect(body.status).toBe("approved");
        });

        it("should keep a chosen submission pending when Auth0 fails, answer 201, alert the admins as usual, and count the choice", async () => {
            await setAutoApproval(true);
            provisioner.script("createClient", "failed");

            const { body } = await submit();

            expect(body).toMatchObject({ status: "pending", auth0ClientId: null });
            expect(await eventTypes(dataSource.manager, body.id)).toEqual(["submitted", "auth0_failed", "email_sent"]);
            expect(emailer.send).toHaveBeenCalledWith(expect.objectContaining({ template: EmailTemplate.ADMIN_ALERT, kind: "submitted" }));
            const [submitted] = await dataSource.query(`SELECT details FROM dapp_event WHERE dapp_id = $1 AND type = 'submitted'`, [
                body.id,
            ]);
            expect(submitted.details).toEqual({ chosenForAutoApproval: true });
        });

        it("should leave dApps already pending alone when auto-approval is turned on", async () => {
            const pending = await submit("waiting@owners.test");

            await testApp.request
                .put("/admin/settings")
                .set("Authorization", admin)
                .send({ autoApproval: { enabled: true } })
                .expect(200);

            expect(await dataSource.manager.findOneByOrFail(Dapp, { id: pending.body.id })).toMatchObject({ status: "pending" });
        });
    });
});
