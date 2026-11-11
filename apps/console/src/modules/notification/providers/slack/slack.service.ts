import { DAPP_FIELDS, DappEventType, DappField, DappFields, diffFields, FIELD_LABELS, MAU_LABELS } from "@shared/modules/dapp";
import { AdminAlertKind, ISlackNotifierService, SlackAlert } from "../../interfaces/i-slack-notifier.service";
import { SlackWebhookPayload } from "./slack.types";

/**
 * Escapes Slack mrkdwn and collapses whitespace and control characters to spaces. Every field is one line of the message, so
 * a line break in a description could fake another field.
 * @param value The user-supplied text.
 * @returns The text, safe to put on one line of the message.
 */
function escapeMrkdwn(value: string): string {
    return value
        .replace(/[\s\p{Cc}]+/gu, " ")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

const ADMIN_ALERTS: Record<AdminAlertKind, { subject: string; body: string }> = {
    [DappEventType.SUBMITTED]: { subject: "New dApp submission to review", body: "was submitted and is waiting for review." },
    [DappEventType.AUTO_APPROVED]: { subject: "A dApp was auto-approved", body: "was approved automatically and got an Auth0 client." },
    [DappEventType.RESUBMITTED]: {
        subject: "A dApp was resubmitted for review",
        body: "was resubmitted after a rejection and is waiting for review again.",
    },
    [DappEventType.CHANGE_REQUESTED]: {
        subject: "A dApp change request to review",
        body: "has a change request that is waiting for review.",
    },
};

const FIELD_LINES: Record<DappField, (fields: DappFields) => string> = {
    name: (fields) => escapeMrkdwn(fields.name),
    description: (fields) => (fields.description === "" ? "—" : escapeMrkdwn(fields.description)),
    logoUrl: (fields) => escapeMrkdwn(fields.logoUrl),
    mauBracket: (fields) => MAU_LABELS[fields.mauBracket],
    callbackUrls: (fields) => (fields.callbackUrls.length === 0 ? "—" : fields.callbackUrls.map(escapeMrkdwn).join(", ")),
    logoutUrls: (fields) => (fields.logoutUrls.length === 0 ? "—" : fields.logoutUrls.map(escapeMrkdwn).join(", ")),
    webOrigins: (fields) => (fields.webOrigins.length === 0 ? "—" : fields.webOrigins.map(escapeMrkdwn).join(", ")),
    contactEmail: (fields) => escapeMrkdwn(fields.contactEmail),
};

/**
 * Builds the webhook payload for an alert, with every dApp field and, on a resubmission, what changed since the rejection.
 * @param alert The alert.
 * @param publicUrl The console's public URL, for the review link.
 * @returns The webhook payload, with link previews off.
 */
export function slackMessage(alert: SlackAlert, publicUrl: string): SlackWebhookPayload {
    const { dapp } = alert;
    const copy = ADMIN_ALERTS[alert.kind];
    const url = `${publicUrl}/admin/dapps/${encodeURIComponent(dapp.id)}`;
    const resubmitted = alert.kind === DappEventType.RESUBMITTED;
    const before = resubmitted ? alert.rejected : dapp;
    const changed: string[] = diffFields(DAPP_FIELDS, before, dapp).map((change) => change.field);
    const resubmission = resubmitted && changed.length === 0 ? ["Nothing was changed since the rejection."] : [];
    const fields = Object.entries(FIELD_LINES).map(([field, format]) => {
        const label = FIELD_LABELS[field as DappField];
        return changed.includes(field) ? `*${label} (changed):* ${format(dapp)} (was: ${format(before)})` : `*${label}:* ${format(dapp)}`;
    });
    return {
        text: [
            `*${copy.subject}*`,
            `${escapeMrkdwn(dapp.name)} ${copy.body}`,
            `<${url}|Review it in the console>`,
            ...resubmission,
            ...fields,
        ].join("\n"),
        unfurl_links: false,
        unfurl_media: false,
    };
}

export class SlackService implements ISlackNotifierService {
    constructor(
        private readonly webhookUrl: string,
        private readonly publicUrl: string,
        private readonly timeoutMs: number,
    ) {}

    /**
     * Posts the alert to the webhook within the configured deadline, and throws when Slack answers with an error status.
     * @param alert The alert.
     */
    async notify(alert: SlackAlert): Promise<void> {
        const response = await fetch(this.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(slackMessage(alert, this.publicUrl)),
            signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) {
            throw Object.assign(new Error(`Slack webhook answered ${response.status}`), { code: `HTTP_${response.status}` });
        }
    }
}
