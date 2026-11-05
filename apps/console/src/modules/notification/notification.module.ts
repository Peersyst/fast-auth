import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NearNetwork } from "../../config/auth0.config";
import { EmailConfig } from "../../config/email.config";
import { SlackConfig } from "../../config/slack.config";
import { SesService } from "./providers/ses/ses.service";
import { SlackService } from "./providers/slack/slack.service";
import { EmailContext } from "./templates/templates";
import { IEmailerService } from "./interfaces/i-emailer.service";
import { ISlackNotifierService } from "./interfaces/i-slack-notifier.service";
import { EMAILER, SLACK_NOTIFIER } from "./notification.tokens";

const SLACK_OFF: ISlackNotifierService = { notify: async () => undefined };
const EMAIL_OFF: IEmailerService = { send: async () => undefined };

/**
 * Builds the emailer that config selects.
 * @param configService The config service.
 * @returns The SES emailer, or one that drops every email.
 */
function createEmailer(configService: ConfigService): IEmailerService {
    const email = configService.get<EmailConfig>("email")!;
    const context: EmailContext = {
        publicUrl: configService.get<string>("server.publicUrl")!,
        nearNetwork: configService.get<NearNetwork>("auth0.nearNetwork")!,
        guideUrl: email.guideUrl,
    };
    return email.ses === null ? EMAIL_OFF : new SesService(context, email.ses);
}

/**
 * Builds the Slack notifier, which drops every alert when no webhook URL is set.
 * @param configService The config service.
 * @returns The webhook notifier, or one that drops every alert.
 */
function createSlackNotifier(configService: ConfigService): ISlackNotifierService {
    const { webhookUrl, timeoutMs } = configService.get<SlackConfig>("slack")!;
    return webhookUrl === null ? SLACK_OFF : new SlackService(webhookUrl, configService.get<string>("server.publicUrl")!, timeoutMs);
}

@Module({
    providers: [
        { provide: EMAILER, inject: [ConfigService], useFactory: createEmailer },
        { provide: SLACK_NOTIFIER, inject: [ConfigService], useFactory: createSlackNotifier },
    ],
    exports: [EMAILER, SLACK_NOTIFIER],
})
export class NotificationModule {}
