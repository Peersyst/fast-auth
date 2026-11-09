import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SlackConfig } from "../../config/slack.config";
import { SlackService } from "./providers/slack/slack.service";
import { ISlackNotifierService } from "./interfaces/i-slack-notifier.service";
import { SLACK_NOTIFIER } from "./notification.tokens";

const SLACK_OFF: ISlackNotifierService = { notify: async () => undefined };

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
    providers: [{ provide: SLACK_NOTIFIER, inject: [ConfigService], useFactory: createSlackNotifier }],
    exports: [SLACK_NOTIFIER],
})
export class NotificationModule {}
