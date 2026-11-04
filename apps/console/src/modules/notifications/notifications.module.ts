import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailProviderName } from "../../config/console-config";
import type { ConsoleConfig } from "../../config/console-config";
import { EMAILER } from "./emailer";
import type { Emailer } from "./emailer";
import { SesEmailer } from "./ses.emailer";
import { SLACK_NOTIFIER } from "./slack-notifier";
import type { SlackNotifier } from "./slack-notifier";
import { SlackWebhookNotifier } from "./slack-webhook.notifier";
import type { EmailContext } from "./templates/templates";

const SLACK_OFF: SlackNotifier = { notify: async () => undefined };
const EMAIL_OFF: Emailer = { send: async () => undefined };

/**
 * Builds the emailer that config selects.
 * @param configService The console config.
 * @returns The SES emailer, or one that drops every email.
 */
function createEmailer(configService: ConfigService<ConsoleConfig, true>): Emailer {
    const email = configService.get("email", { infer: true });
    const context: EmailContext = {
        publicUrl: configService.get("server.publicUrl", { infer: true }),
        nearNetwork: configService.get("auth0.nearNetwork", { infer: true }),
    };
    switch (email.provider) {
        case EmailProviderName.SES:
            return new SesEmailer(context, email);
        case EmailProviderName.FAKE:
            return EMAIL_OFF;
    }
}

/**
 * Builds the Slack notifier, which drops every alert when no webhook URL is set.
 * @param configService The console config.
 * @returns The webhook notifier, or one that drops every alert.
 */
function createSlackNotifier(configService: ConfigService<ConsoleConfig, true>): SlackNotifier {
    const { webhookUrl, timeoutMs } = configService.get("slack", { infer: true });
    return webhookUrl === null
        ? SLACK_OFF
        : new SlackWebhookNotifier(webhookUrl, configService.get("server.publicUrl", { infer: true }), timeoutMs);
}

@Module({
    providers: [
        { provide: EMAILER, inject: [ConfigService], useFactory: createEmailer },
        { provide: SLACK_NOTIFIER, inject: [ConfigService], useFactory: createSlackNotifier },
    ],
    exports: [EMAILER, SLACK_NOTIFIER],
})
export class NotificationsModule {}
