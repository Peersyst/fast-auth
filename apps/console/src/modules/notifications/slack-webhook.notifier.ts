import type { DappField, DappFields, MauBracket } from "../../domain/dapp";
import { DAPP_FIELDS } from "../../domain/dapp";
import { diffFields } from "../../domain/dapp-edits";
import type { SlackAlert, SlackNotifier } from "./slack-notifier";
import { ADMIN_ALERTS, adminDappUrl } from "./templates/templates";

const TIMEOUT_MS = 5_000;

const MAU_LABELS: Record<MauBracket, string> = {
    lt1k: "Less than 1,000",
    "1k_10k": "1,000 – 10,000",
    "10k_25k": "10,000 – 25,000",
    gt25k: "More than 25,000",
};

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

const FIELD_LINES: Record<DappField, { label: string; format: (fields: DappFields) => string }> = {
    name: { label: "Name", format: (fields) => escapeMrkdwn(fields.name) },
    description: { label: "Description", format: (fields) => (fields.description === "" ? "—" : escapeMrkdwn(fields.description)) },
    logoUrl: { label: "Logo", format: (fields) => escapeMrkdwn(fields.logoUrl) },
    mauBracket: { label: "Expected MAU", format: (fields) => MAU_LABELS[fields.mauBracket] },
    callbackUrls: { label: "Callback URLs", format: (fields) => urlList(fields.callbackUrls) },
    logoutUrls: { label: "Logout URLs", format: (fields) => urlList(fields.logoutUrls) },
    webOrigins: { label: "Web origins", format: (fields) => urlList(fields.webOrigins) },
    contactEmail: { label: "Contact", format: (fields) => escapeMrkdwn(fields.contactEmail) },
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
    const fields = Object.entries(FIELD_LINES).map(([field, { label, format }]) =>
        rejected !== null && changed.has(field)
            ? `*${label} (changed):* ${format(dapp)} (was: ${format(rejected)})`
            : `*${label}:* ${format(dapp)}`,
    );
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
