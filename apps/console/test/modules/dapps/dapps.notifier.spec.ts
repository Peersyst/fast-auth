import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import type { EntityManager } from "typeorm";
import { DataSource } from "typeorm";
import { DappStatus } from "@shared/console-domain/dapp";
import { DappsMetrics } from "../../../src/modules/dapps/dapps.metrics";
import { DappsNotifier } from "../../../src/modules/dapps/dapps.notifier";
import { DappEventsRepository } from "../../../src/modules/dapps/repositories/dapp-events.repository";
import { EMAILER } from "../../../src/modules/notifications/emailer";
import { SLACK_NOTIFIER } from "../../../src/modules/notifications/slack-notifier";
import { DappEventsRepositoryMock, DappsMetricsMock, EmailerMock, SlackNotifierMock } from "../../mocks";
import { makeDapp } from "../../utils/dapp";
import { TEST_CONFIG } from "../../utils/test-config";

describe("DappsNotifier", () => {
    const manager = {} as EntityManager;
    const dapp = makeDapp({ status: DappStatus.PENDING, auth0ClientId: null });

    let emailer: InstanceType<typeof EmailerMock>;
    let slack: InstanceType<typeof SlackNotifierMock>;
    let events: InstanceType<typeof DappEventsRepositoryMock>;
    let metrics: InstanceType<typeof DappsMetricsMock>;
    let notifier: DappsNotifier;
    let warn: jest.SpyInstance;
    let error: jest.SpyInstance;

    beforeAll(() => {
        warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
        error = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    });

    afterAll(() => {
        warn.mockRestore();
        error.mockRestore();
    });

    beforeEach(async () => {
        emailer = new EmailerMock();
        slack = new SlackNotifierMock();
        events = new DappEventsRepositoryMock();
        metrics = new DappsMetricsMock();
        const module = await Test.createTestingModule({
            providers: [
                DappsNotifier,
                { provide: DataSource, useValue: { manager } },
                { provide: DappEventsRepository, useValue: events },
                { provide: DappsMetrics, useValue: metrics },
                { provide: EMAILER, useValue: emailer },
                { provide: SLACK_NOTIFIER, useValue: slack },
                { provide: ConfigService, useValue: new ConfigService(TEST_CONFIG) },
            ],
        }).compile();

        warn.mockClear();
        error.mockClear();
        notifier = module.get(DappsNotifier);
    });

    describe("submitted", () => {
        it("should email the admins an admin alert, record email_sent, and post a submitted Slack alert", async () => {
            await notifier.submitted(dapp);

            expect(emailer.send.mock.calls).toEqual([[{ template: "admin_alert", to: ["admin@example.test"], dapp, kind: "submitted" }]]);
            expect(metrics.countEmail.mock.calls).toEqual([["admin_alert", "sent"]]);
            expect(events.append.mock.calls).toEqual([
                [manager, dapp.id, { email: null, role: "system" }, { type: "email_sent", details: { template: "admin_alert" } }],
            ]);
            expect(slack.notify.mock.calls).toEqual([[{ kind: "submitted", dapp }]]);
        });

        it("should record email_failed with the cause and still post to Slack when the email fails", async () => {
            emailer.send.mockRejectedValueOnce(new Error("SES is down"));

            await notifier.submitted(dapp);

            expect(metrics.countEmail.mock.calls).toEqual([["admin_alert", "failed"]]);
            expect(events.append.mock.calls).toEqual([
                [
                    manager,
                    dapp.id,
                    { email: null, role: "system" },
                    { type: "email_failed", details: { template: "admin_alert", error: "SES is down" } },
                ],
            ]);
            expect(warn.mock.calls).toEqual([[`Email admin_alert for dApp ${dapp.id} failed: Error`]]);
            expect(slack.notify.mock.calls).toEqual([[{ kind: "submitted", dapp }]]);
        });

        it("should log and still post to Slack when recording the email event fails", async () => {
            events.append.mockRejectedValueOnce(new Error("connection lost"));

            await notifier.submitted(dapp);

            expect(error.mock.calls).toEqual([
                [`Could not record email_sent for dApp ${dapp.id}`, expect.stringContaining("connection lost")],
            ]);
            expect(slack.notify.mock.calls).toEqual([[{ kind: "submitted", dapp }]]);
        });

        it("should log instead of throwing when the Slack alert fails", async () => {
            slack.notify.mockRejectedValueOnce(new Error("Slack is down"));

            await expect(notifier.submitted(dapp)).resolves.toBeUndefined();
            expect(warn.mock.calls).toEqual([[`Slack alert submitted for dApp ${dapp.id} failed: Error`]]);
        });
    });
});
