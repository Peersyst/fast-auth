import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { DappEvent } from "@database/console/entities";
import { createAutoApprovalSetting, createDapp, createDappEvent } from "@database/console/test/factories";
import { ActorRole, DappStatus } from "@shared/modules/dapp";
import { AnonymiseCommand } from "../../../src/modules/script/anonymise.command";
import { ReconcileCommand } from "../../../src/modules/script/reconcile.command";
import { ScriptModule } from "../../../src/modules/script/script.module";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { EMAILER, SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { testKeySet } from "../../mocks/auth/token.mock";
import { testConfig } from "../../mocks/config/config.mock";
import { findDapp } from "../../mocks/dapp/dapp.mock";
import { EmailerMock } from "../../mocks/notification/emailer.mock";
import { SlackNotifierMock } from "../../mocks/notification/slack-notifier.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";

describe("ScriptModule (integration)", () => {
    const provisioner = new FakeProvisionerMock();
    let testApp: TestApp;
    let dataSource: DataSource;

    beforeAll(async () => {
        testApp = await createTestApp({
            imports: [
                ConfigModule.forRoot({ load: [testConfig], isGlobal: true }),
                TypeOrmModule.forRoot(testConfig().database),
                ScheduleModule.forRoot(),
                ScriptModule,
            ],
            overrides: [
                { provide: JWT_KEY_SET, useValue: await testKeySet() },
                { provide: EMAILER, useValue: new EmailerMock() },
                { provide: SLACK_NOTIFIER, useValue: new SlackNotifierMock() },
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
        provisioner.reset();
    });

    describe("reconcile", () => {
        it("should compare the tagged clients with the dApps in the database", async () => {
            const approved = await createDapp(dataSource.manager, { status: DappStatus.APPROVED, auth0ClientId: "c-used" });
            const missing = await createDapp(dataSource.manager, { status: DappStatus.APPROVED, auth0ClientId: "c-gone" });
            const pending = await createDapp(dataSource.manager);
            provisioner.clients.set("c-used", { dappId: approved.id, input: approved });
            provisioner.clients.set("c-orphan", { dappId: pending.id, input: pending });

            const report = await testApp.module.get(ReconcileCommand).report();

            expect(report.orphanClients.map(({ clientId, dappStatus }) => [clientId, dappStatus])).toEqual([["c-orphan", "pending"]]);
            expect(report.missingClients.map(({ id }) => id)).toEqual([missing.id]);
        });
    });

    describe("anonymise", () => {
        it("should erase a removed dApp's personal data and its events' in place, and change nothing on a rerun", async () => {
            const dapp = await createDapp(dataSource.manager, {
                status: DappStatus.REMOVED,
                ownerEmail: "alice@example.com",
                removedBy: "alice@example.com",
                removalReason: "Asked by alice@example.com.",
            });
            await createDappEvent(dataSource.manager, { dappId: dapp.id, actorEmail: "alice@example.com", actorRole: ActorRole.USER });
            const command = testApp.module.get(AnonymiseCommand);

            const result = await command.anonymise(dapp.id);

            expect(result).toEqual({
                erasedColumns: ["ownerEmail", "contactEmail", "removedBy"],
                scrubbedColumns: ["removalReason"],
                erasedActors: 1,
                scrubbedDetails: 0,
                events: 1,
            });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                ownerEmail: "erased",
                removedBy: "erased",
                removalReason: "Asked by erased.",
            });
            expect(await dataSource.manager.findOneByOrFail(DappEvent, { dappId: dapp.id })).toMatchObject({ actorEmail: "erased" });
            expect(await command.anonymise(dapp.id)).toMatchObject({ erasedColumns: [], scrubbedColumns: [], erasedActors: 0 });
        });

        it("should refuse a dApp that is not removed and change nothing", async () => {
            const dapp = await createDapp(dataSource.manager, { ownerEmail: "alice@example.com" });

            await expect(testApp.module.get(AnonymiseCommand).anonymise(dapp.id)).rejects.toThrow(
                `dApp ${dapp.id} is pending: only a removed dApp can be anonymised`,
            );
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({ ownerEmail: "alice@example.com" });
        });
    });
});
