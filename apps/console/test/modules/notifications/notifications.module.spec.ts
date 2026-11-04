import { SESv2Client } from "@aws-sdk/client-sesv2";
import type { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { CLIENT_ID, makeDapp } from "../../utils/dapp";
import { createTestingModuleWithConfig, SES_EMAIL, TEST_CONFIG } from "../../utils/test-config";
import { EmailProviderName, NearNetwork } from "../../../src/config/console-config";
import type { ConsoleConfig } from "../../../src/config/console-config";
import { EmailTemplate } from "@shared/console-domain/dapp-event";
import { EMAILER } from "../../../src/modules/notifications/emailer";
import type { Emailer } from "../../../src/modules/notifications/emailer";
import { NotificationsModule } from "../../../src/modules/notifications/notifications.module";
import { SesEmailer } from "../../../src/modules/notifications/ses.emailer";
import { SLACK_NOTIFIER } from "../../../src/modules/notifications/slack-notifier";
import type { SlackNotifier } from "../../../src/modules/notifications/slack-notifier";
import { SlackWebhookNotifier } from "../../../src/modules/notifications/slack-webhook.notifier";

/**
 * Builds the test config for an email provider and an optional Slack webhook.
 * @param provider The email provider to select.
 * @param webhookUrl The Slack webhook URL, or null to turn Slack off.
 * @returns The config.
 */
const makeConfig = (provider: EmailProviderName, webhookUrl: string | null = null): ConsoleConfig => ({
    ...TEST_CONFIG,
    email: provider === EmailProviderName.SES ? SES_EMAIL : TEST_CONFIG.email,
    slack: { ...TEST_CONFIG.slack, webhookUrl },
});

describe("NotificationsModule", () => {
    it("should provide the SES emailer when EMAIL_PROVIDER is ses", async () => {
        const moduleRef = await createTestingModuleWithConfig(makeConfig(EmailProviderName.SES), NotificationsModule).compile();
        expect(moduleRef.get(EMAILER)).toBeInstanceOf(SesEmailer);
        await moduleRef.close();
    });

    it("should provide an emailer that sends nothing when EMAIL_PROVIDER is fake", async () => {
        const send = jest.spyOn(SESv2Client.prototype, "send");
        const moduleRef = await createTestingModuleWithConfig(makeConfig(EmailProviderName.FAKE), NotificationsModule).compile();
        const emailer = moduleRef.get<Emailer>(EMAILER);

        expect(emailer).not.toBeInstanceOf(SesEmailer);
        await emailer.send({ template: EmailTemplate.DAPP_APPROVED, to: "owner@acme.example", dapp: makeDapp(), clientId: CLIENT_ID });
        expect(send).not.toHaveBeenCalled();
        send.mockRestore();
        await moduleRef.close();
    });

    it("should render emails with the configured public URL and NEAR network", async () => {
        const send = jest.spyOn(SESv2Client.prototype, "send").mockImplementation(async () => ({}));
        const moduleRef = await createTestingModuleWithConfig(
            {
                ...makeConfig(EmailProviderName.SES),
                server: { ...TEST_CONFIG.server, publicUrl: "https://console.near.example" },
                auth0: { ...TEST_CONFIG.auth0, nearNetwork: NearNetwork.MAINNET },
            },
            NotificationsModule,
        ).compile();

        await moduleRef
            .get<Emailer>(EMAILER)
            .send({ template: EmailTemplate.DAPP_APPROVED, to: "owner@acme.example", dapp: makeDapp(), clientId: CLIENT_ID });
        const text = (send.mock.calls[0]?.[0] as SendEmailCommand).input.Content?.Simple?.Body?.Text?.Data;
        expect(text).toContain(`network: "mainnet",`);
        expect(text).toContain("https://console.near.example/");
        send.mockRestore();
        await moduleRef.close();
    });

    it("should provide the Slack webhook notifier when SLACK_WEBHOOK_URL is set", async () => {
        const moduleRef = await createTestingModuleWithConfig(
            makeConfig(EmailProviderName.FAKE, "https://hooks.slack.com/services/T000/B000/token"),
            NotificationsModule,
        ).compile();
        expect(moduleRef.get(SLACK_NOTIFIER)).toBeInstanceOf(SlackWebhookNotifier);
        await moduleRef.close();
    });

    it("should provide a notifier that posts nothing when SLACK_WEBHOOK_URL is empty", async () => {
        const fetchMock = jest.spyOn(globalThis, "fetch");
        const moduleRef = await createTestingModuleWithConfig(makeConfig(EmailProviderName.FAKE), NotificationsModule).compile();
        const notifier = moduleRef.get<SlackNotifier>(SLACK_NOTIFIER);

        expect(notifier).not.toBeInstanceOf(SlackWebhookNotifier);
        await notifier.notify({ kind: "submitted", dapp: makeDapp() });
        expect(fetchMock).not.toHaveBeenCalled();
        fetchMock.mockRestore();
        await moduleRef.close();
    });
});
