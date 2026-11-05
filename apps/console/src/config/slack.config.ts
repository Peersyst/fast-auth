import { buildConfig, validPositiveInt } from "@backend/config";

export interface SlackConfig {
    /** A Slack incoming webhook for admin alerts. Null turns Slack off. */
    webhookUrl: string | null;
    timeoutMs: number;
}

/**
 * Validates an https://hooks.slack.com/ webhook URL, or none.
 * @param url The URL to validate.
 * @returns True if the URL is null or a Slack webhook.
 */
const validWebhookUrl = (url: string | null): boolean =>
    url === null || (URL.canParse(url) && new URL(url).protocol === "https:" && new URL(url).hostname === "hooks.slack.com");

/**
 * Builds the Slack configuration.
 * @returns The Slack configuration.
 */
export default (): SlackConfig => {
    return buildConfig<SlackConfig>(
        {
            webhookUrl: process.env.SLACK_WEBHOOK_URL || null,
            timeoutMs: process.env.SLACK_TIMEOUT_MS ? parseInt(process.env.SLACK_TIMEOUT_MS) : 5000,
        },
        { webhookUrl: validWebhookUrl, timeoutMs: validPositiveInt },
    );
};
