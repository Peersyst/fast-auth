import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import type { SesEmailConfig } from "../../config/console-config";
import type { ConsoleEmail, Emailer } from "./emailer";
import type { EmailContext } from "./templates/templates";
import { renderEmail } from "./templates/templates";

const CHARSET = "UTF-8";
// Emails are sent inside the request that caused them, so one deadline bounds every attempt, body included. A send that
// hangs is aborted, not retried. Throttling, a 5xx or a dropped connection gets one retry, which can deliver an email
// twice if SES had already accepted it; losing an approval email is worse than sending it twice.
const DEADLINE_MS = 10_000;
const MAX_ATTEMPTS = 2;

export class SesEmailer implements Emailer {
    private readonly client: SESv2Client;

    constructor(
        private readonly context: EmailContext,
        private readonly config: SesEmailConfig,
    ) {
        this.client = new SESv2Client({
            region: config.region,
            maxAttempts: MAX_ATTEMPTS,
        });
    }

    async send(email: ConsoleEmail): Promise<void> {
        const { subject, html, text } = renderEmail(email, this.context);
        await this.client.send(
            new SendEmailCommand({
                FromEmailAddress: this.config.from,
                Destination: { ToAddresses: typeof email.to === "string" ? [email.to] : email.to },
                Content: {
                    Simple: {
                        Subject: { Data: subject, Charset: CHARSET },
                        Body: { Html: { Data: html, Charset: CHARSET }, Text: { Data: text, Charset: CHARSET } },
                    },
                },
            }),
            { abortSignal: AbortSignal.timeout(DEADLINE_MS) },
        );
    }
}
