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
import { CLIENT_ID, makeDapp } from "../../utils/dapp";
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

    describe("autoApproved", () => {
        it("should email the owner the approval and the admins an auto_approved alert, then post an auto_approved Slack alert", async () => {
            const approved = makeDapp();

            await notifier.autoApproved(approved);

            expect(emailer.send.mock.calls).toEqual([
                [{ template: "dapp_approved", to: "owner@acme.example", dapp: approved, clientId: CLIENT_ID }],
                [{ template: "admin_alert", to: ["admin@example.test"], dapp: approved, kind: "auto_approved" }],
            ]);
            expect(slack.notify.mock.calls).toEqual([[{ kind: "auto_approved", dapp: approved }]]);
        });
    });

    describe("resubmitted", () => {
        it("should email the admins a resubmitted alert and post a resubmitted Slack alert with the rejected dApp and its reason", async () => {
            const rejected = makeDapp({ status: DappStatus.REJECTED, auth0ClientId: null, rejectionReason: "Logo is blurry" });

            await notifier.resubmitted(dapp, rejected);

            expect(emailer.send.mock.calls).toEqual([[{ template: "admin_alert", to: ["admin@example.test"], dapp, kind: "resubmitted" }]]);
            expect(slack.notify.mock.calls).toEqual([[{ kind: "resubmitted", dapp, rejected, rejectionReason: "Logo is blurry" }]]);
        });
    });

    describe("changeRequested", () => {
        it("should email the admins a change_requested alert without posting to Slack", async () => {
            const approved = makeDapp();

            await notifier.changeRequested(approved);

            expect(emailer.send.mock.calls).toEqual([
                [{ template: "admin_alert", to: ["admin@example.test"], dapp: approved, kind: "change_requested" }],
            ]);
            expect(slack.notify.mock.calls).toEqual([]);
        });
    });

    describe("approved", () => {
        it("should email the owner the approval with the Auth0 client id", async () => {
            const approved = makeDapp();

            await notifier.approved(approved);

            expect(emailer.send.mock.calls).toEqual([
                [{ template: "dapp_approved", to: "owner@acme.example", dapp: approved, clientId: CLIENT_ID }],
            ]);
            expect(slack.notify.mock.calls).toEqual([]);
        });

        it("should throw before sending anything when the dApp has no Auth0 client", async () => {
            await expect(notifier.approved(dapp)).rejects.toThrow(`Approved dApp ${dapp.id} has no Auth0 client`);
            expect(emailer.send.mock.calls).toEqual([]);
            expect(events.append.mock.calls).toEqual([]);
        });
    });

    describe("rejected", () => {
        it("should email the owner the rejection with the reason", async () => {
            await notifier.rejected(dapp, "Logo is blurry");

            expect(emailer.send.mock.calls).toEqual([
                [{ template: "dapp_rejected", to: "owner@acme.example", dapp, reason: "Logo is blurry" }],
            ]);
            expect(slack.notify.mock.calls).toEqual([]);
        });
    });

    describe("changeApproved", () => {
        it("should email the owner that the change was approved", async () => {
            const approved = makeDapp();

            await notifier.changeApproved(approved);

            expect(emailer.send.mock.calls).toEqual([[{ template: "change_approved", to: "owner@acme.example", dapp: approved }]]);
            expect(slack.notify.mock.calls).toEqual([]);
        });
    });

    describe("changeRejected", () => {
        it("should email the owner that the change was rejected with the reason", async () => {
            const approved = makeDapp();

            await notifier.changeRejected(approved, "Callback is not HTTPS");

            expect(emailer.send.mock.calls).toEqual([
                [{ template: "change_rejected", to: "owner@acme.example", dapp: approved, reason: "Callback is not HTTPS" }],
            ]);
            expect(slack.notify.mock.calls).toEqual([]);
        });
    });

    describe("editedByAdmin", () => {
        it("should email the owner that an admin changed the dApp", async () => {
            await notifier.editedByAdmin(dapp);

            expect(emailer.send.mock.calls).toEqual([[{ template: "changed_by_admin", to: "owner@acme.example", dapp }]]);
            expect(slack.notify.mock.calls).toEqual([]);
        });
    });

    describe("removedByAdmin", () => {
        it("should email the owner the removal with the reason", async () => {
            await notifier.removedByAdmin(dapp, "Phishing");

            expect(emailer.send.mock.calls).toEqual([
                [{ template: "removed_by_admin", to: "owner@acme.example", dapp, reason: "Phishing" }],
            ]);
            expect(slack.notify.mock.calls).toEqual([]);
        });
    });
});
