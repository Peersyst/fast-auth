import { closeTestApp, createTestApp, TestApp, truncateAll } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { DappEvent } from "@database/console/entities";
import { createDapp, createDappEvent } from "@database/console/test/factories";
import { ActorRole, DappEventType, DappStatus } from "@shared/modules/dapp";
import { AnonymiseCommand } from "../../../src/modules/script/anonymise.command";
import { ReconcileCommand } from "../../../src/modules/script/reconcile.command";
import { ScriptModule } from "../../../src/modules/script/script.module";
import { JWT_KEY_SET } from "../../../src/modules/auth/jwt-key-set";
import { SLACK_NOTIFIER } from "../../../src/modules/notification/notification.tokens";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { testKeySet } from "../../mocks/auth/token.mock";
import { testConfig } from "../../mocks/config/config.mock";
import { findDapp } from "../../mocks/dapp/dapp.mock";
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
                ScriptModule,
            ],
            overrides: [
                { provide: JWT_KEY_SET, useValue: await testKeySet() },
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
                auth0Error: "Address not verified: alice@example.com.",
            });
            await createDappEvent(dataSource.manager, {
                dappId: dapp.id,
                type: DappEventType.EDITED,
                actorRole: ActorRole.USER,
                details: { changes: [{ field: "description", before: "Ask alice@example.com.", after: "Ask us." }] },
            });
            const command = testApp.module.get(AnonymiseCommand);

            const result = await command.anonymise(dapp.id);

            expect(result).toEqual({
                erasedColumns: ["ownerEmail", "contactEmail"],
                scrubbedColumns: ["auth0Error"],
                scrubbedDetails: 1,
                events: 1,
            });
            expect(await findDapp(dataSource.manager, dapp.id)).toMatchObject({
                ownerEmail: "erased",
                auth0Error: "Address not verified: erased.",
            });
            expect(await dataSource.manager.findOneByOrFail(DappEvent, { dappId: dapp.id })).toMatchObject({
                details: { changes: [{ field: "description", before: "Ask erased.", after: "Ask us." }] },
            });
            expect(await command.anonymise(dapp.id)).toMatchObject({ erasedColumns: [], scrubbedColumns: [], scrubbedDetails: 0 });
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
