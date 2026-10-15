import type { DappField, DappFields } from "../../domain/dapp";
import { DAPP_FIELDS, FIELD_LABELS, MAU_LABELS } from "../../domain/dapp";
import { diffFields } from "../../domain/dapp-edits";
import type { SlackAlert, SlackNotifier } from "./slack-notifier";
import { ADMIN_ALERTS, adminDappUrl } from "./templates/templates";

const TIMEOUT_MS = 5_000;

// Every field is one line of the message, so a line break in a description could fake another field.
function escapeMrkdwn(value: string): string {
    return value
        .replace(/[\s\p{Cc}]+/gu, " ")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function urlList(urls: readonly string[]): string {
    return urls.length === 0 ? "—" : urls.map(escapeMrkdwn).join(", ");
}

const FIELD_LINES: Record<DappField, (fields: DappFields) => string> = {
    name: (fields) => escapeMrkdwn(fields.name),
    description: (fields) => (fields.description === "" ? "—" : escapeMrkdwn(fields.description)),
    logoUrl: (fields) => escapeMrkdwn(fields.logoUrl),
    mauBracket: (fields) => MAU_LABELS[fields.mauBracket],
    callbackUrls: (fields) => urlList(fields.callbackUrls),
    logoutUrls: (fields) => urlList(fields.logoutUrls),
    webOrigins: (fields) => urlList(fields.webOrigins),
    contactEmail: (fields) => escapeMrkdwn(fields.contactEmail),
};

export function slackMessage(alert: SlackAlert, publicUrl: string): { text: string; unfurl_links: false; unfurl_media: false } {
    const { dapp } = alert;
    const copy = ADMIN_ALERTS[alert.kind];
    const url = adminDappUrl(publicUrl, dapp.id);
    const rejected = alert.kind === "resubmitted" ? alert.rejected : null;
    const changed = new Set<string>(rejected === null ? [] : diffFields(DAPP_FIELDS, rejected, dapp).map((change) => change.field));
    const resubmission =
        alert.kind === "resubmitted"
            ? [
                  `*Rejected because:* ${escapeMrkdwn(alert.rejectionReason)}`,
                  ...(changed.size === 0 ? ["Nothing was changed since the rejection."] : []),
              ]
            : [];
    const fields = Object.entries(FIELD_LINES).map(([field, format]) => {
        const label = FIELD_LABELS[field as DappField];
        return rejected !== null && changed.has(field)
            ? `*${label} (changed):* ${format(dapp)} (was: ${format(rejected)})`
            : `*${label}:* ${format(dapp)}`;
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

export class SlackWebhookNotifier implements SlackNotifier {
    constructor(
        private readonly webhookUrl: string,
        private readonly publicUrl: string,
    ) {}

    async notify(alert: SlackAlert): Promise<void> {
        const response = await fetch(this.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(slackMessage(alert, this.publicUrl)),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        await response.body?.cancel();
        if (!response.ok) {
            throw Object.assign(new Error(`Slack webhook answered ${response.status}`), { code: `HTTP_${response.status}` });
        }
    }
}
