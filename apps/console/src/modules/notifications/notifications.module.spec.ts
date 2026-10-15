import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import { CLIENT_ID, makeDapp } from "../../../test/utils/dapp";
import { SES_EMAIL, TEST_CONFIG } from "../../../test/utils/test-config";
import { CONSOLE_CONFIG } from "../../config/console-config";
import type { ConsoleConfig, EmailProviderName } from "../../config/console-config";
import { EMAILER } from "./emailer";
import type { Emailer } from "./emailer";
import { NotificationsModule } from "./notifications.module";
import { SesEmailer } from "./ses.emailer";
import { SLACK_NOTIFIER } from "./slack-notifier";
import type { SlackNotifier } from "./slack-notifier";
import { SlackWebhookNotifier } from "./slack-webhook.notifier";

const makeConfig = (provider: EmailProviderName, webhookUrl: string | null = null): ConsoleConfig => ({
    ...TEST_CONFIG,
    email: provider === "ses" ? SES_EMAIL : TEST_CONFIG.email,
    slack: { webhookUrl },
});

async function compile(config: ConsoleConfig): Promise<TestingModule> {
    @Global()
    @Module({ providers: [{ provide: CONSOLE_CONFIG, useValue: config }], exports: [CONSOLE_CONFIG] })
    class ConfigStubModule {}

    return Test.createTestingModule({ imports: [ConfigStubModule, NotificationsModule] }).compile();
}

describe("NotificationsModule", () => {
    it("provides the SES emailer when EMAIL_PROVIDER is ses", async () => {
        const moduleRef = await compile(makeConfig("ses"));
        expect(moduleRef.get(EMAILER)).toBeInstanceOf(SesEmailer);
        await moduleRef.close();
    });

    it("provides an emailer that sends nothing when EMAIL_PROVIDER is fake", async () => {
        const send = jest.spyOn(SESv2Client.prototype, "send");
        const moduleRef = await compile(makeConfig("fake"));
        const emailer = moduleRef.get<Emailer>(EMAILER);

        expect(emailer).not.toBeInstanceOf(SesEmailer);
        await emailer.send({ template: "dapp_approved", to: "owner@acme.example", dapp: makeDapp(), clientId: CLIENT_ID });
        expect(send).not.toHaveBeenCalled();
        send.mockRestore();
        await moduleRef.close();
    });

    it("renders emails with the configured public URL and NEAR network", async () => {
        const send = jest.spyOn(SESv2Client.prototype, "send").mockImplementation(async () => ({}));
        const moduleRef = await compile({
            ...makeConfig("ses"),
            server: { ...TEST_CONFIG.server, publicUrl: "https://console.near.example" },
            auth0: { ...TEST_CONFIG.auth0, nearNetwork: "mainnet" },
        });

        await moduleRef
            .get<Emailer>(EMAILER)
            .send({ template: "dapp_approved", to: "owner@acme.example", dapp: makeDapp(), clientId: CLIENT_ID });
        const text = (send.mock.calls[0]?.[0] as SendEmailCommand).input.Content?.Simple?.Body?.Text?.Data;
        expect(text).toContain(`network: "mainnet",`);
        expect(text).toContain("https://console.near.example/");
        send.mockRestore();
        await moduleRef.close();
    });

    it("provides the Slack webhook notifier when SLACK_WEBHOOK_URL is set", async () => {
        const moduleRef = await compile(makeConfig("fake", "https://hooks.slack.com/services/T000/B000/token"));
        expect(moduleRef.get(SLACK_NOTIFIER)).toBeInstanceOf(SlackWebhookNotifier);
        await moduleRef.close();
    });

    it("provides a notifier that posts nothing when SLACK_WEBHOOK_URL is empty", async () => {
        const fetchMock = jest.spyOn(globalThis, "fetch");
        const moduleRef = await compile(makeConfig("fake"));
        const notifier = moduleRef.get<SlackNotifier>(SLACK_NOTIFIER);

        expect(notifier).not.toBeInstanceOf(SlackWebhookNotifier);
        await notifier.notify({ kind: "submitted", dapp: makeDapp() });
        expect(fetchMock).not.toHaveBeenCalled();
        fetchMock.mockRestore();
        await moduleRef.close();
    });
});
