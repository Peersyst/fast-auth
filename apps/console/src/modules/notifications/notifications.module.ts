import { Module } from "@nestjs/common";
import { CONSOLE_CONFIG } from "../../config/console-config";
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

function createEmailer(config: ConsoleConfig): Emailer {
    const { email } = config;
    const context: EmailContext = { publicUrl: config.server.publicUrl, nearNetwork: config.auth0.nearNetwork };
    switch (email.provider) {
        case "ses":
            return new SesEmailer(context, email);
        case "fake":
            return EMAIL_OFF;
    }
}

function createSlackNotifier(config: ConsoleConfig): SlackNotifier {
    const { webhookUrl } = config.slack;
    return webhookUrl === null ? SLACK_OFF : new SlackWebhookNotifier(webhookUrl, config.server.publicUrl);
}

@Module({
    providers: [
        { provide: EMAILER, inject: [CONSOLE_CONFIG], useFactory: createEmailer },
        { provide: SLACK_NOTIFIER, inject: [CONSOLE_CONFIG], useFactory: createSlackNotifier },
    ],
    exports: [EMAILER, SLACK_NOTIFIER],
})
export class NotificationsModule {}
