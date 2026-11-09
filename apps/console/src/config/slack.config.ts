import { buildConfig, validPositiveInt } from "@backend/config";

export interface SlackConfig {
    /** A Slack incoming webhook for admin alerts. Null turns Slack off. */
    webhookUrl: string | null;
    timeoutMs: number;
}

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
        { timeoutMs: validPositiveInt },
    );
};
