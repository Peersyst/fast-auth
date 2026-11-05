import { DappEventType, EmailTemplate } from "@shared/modules/dapp";
import { NearNetwork } from "../../../config/auth0.config";
import { AdminAlertKind, ConsoleEmail } from "../interfaces/i-emailer.service";
import { renderLayout, RenderedEmail } from "./layout";

export type EmailContext = {
    publicUrl: string;
    nearNetwork: NearNetwork;
    guideUrl: string;
};

type EmailOf<T extends EmailTemplate> = Extract<ConsoleEmail, { template: T }>;

/**
 * Builds the link to the owner's console home.
 * @param context The email context.
 * @returns The URL.
 */
const ownerUrl = (context: EmailContext): string => `${context.publicUrl}/`;

/**
 * Builds the link to a dApp's admin review page.
 * @param publicUrl The console's public URL.
 * @param dappId The dApp.
 * @returns The URL.
 */
export const adminDappUrl = (publicUrl: string, dappId: string): string => `${publicUrl}/admin/dapps/${encodeURIComponent(dappId)}`;

/**
 * Renders the approval email, with the client id and a provider snippet for the configured network.
 * @param email The email.
 * @param context The email context.
 * @returns The rendered email.
 */
function dappApprovedEmail(email: EmailOf<typeof EmailTemplate.DAPP_APPROVED>, context: EmailContext): RenderedEmail {
    const { dapp, clientId } = email;
    const snippet = [
        'import { JavascriptProvider } from "@fast-auth-near/javascript-provider";',
        "",
        "const provider = new JavascriptProvider({",
        `    network: "${context.nearNetwork}",`,
        `    clientId: "${clientId}",`,
        "});",
    ].join("\n");
    return renderLayout("Your dApp is approved on NEAR Auth", "Your dApp is approved", [
        { type: "paragraph", text: `${dapp.name} is approved. Its client id is:` },
        { type: "code", text: clientId },
        {
            type: "paragraph",
            text: `Pass it to the NEAR Auth JavaScript provider on ${context.nearNetwork}. The login domain and signing audience are set from the network by default:`,
        },
        { type: "code", text: snippet },
        { type: "paragraph", text: "Use one of the callback URLs you registered as your redirect URI." },
        { type: "link", label: "Read the authentication guide", href: context.guideUrl },
        { type: "link", label: "Open the NEAR Auth Console", href: ownerUrl(context) },
    ]);
}

/**
 * Renders the rejection email, quoting the reviewer's reason.
 * @param email The email.
 * @param context The email context.
 * @returns The rendered email.
 */
function dappRejectedEmail(email: EmailOf<typeof EmailTemplate.DAPP_REJECTED>, context: EmailContext): RenderedEmail {
    return renderLayout("Your dApp needs changes before approval", "Your dApp needs changes", [
        { type: "paragraph", text: `${email.dapp.name} needs changes before it can be approved. The reviewer wrote:` },
        { type: "quote", text: email.reason },
        { type: "paragraph", text: "Edit your dApp in the console to address this. Saving your changes resubmits it for review." },
        { type: "link", label: "Edit your dApp", href: ownerUrl(context) },
    ]);
}

/**
 * Renders the email that a change request went live.
 * @param email The email.
 * @param context The email context.
 * @returns The rendered email.
 */
function changeApprovedEmail(email: EmailOf<typeof EmailTemplate.CHANGE_APPROVED>, context: EmailContext): RenderedEmail {
    return renderLayout("Your dApp change is approved", "Your change is approved", [
        { type: "paragraph", text: `The change you requested for ${email.dapp.name} is approved and now live.` },
        { type: "link", label: "Open the NEAR Auth Console", href: ownerUrl(context) },
    ]);
}

/**
 * Renders the email that a change request was refused, quoting the reviewer's reason.
 * @param email The email.
 * @param context The email context.
 * @returns The rendered email.
 */
function changeRejectedEmail(email: EmailOf<typeof EmailTemplate.CHANGE_REJECTED>, context: EmailContext): RenderedEmail {
    return renderLayout("Your dApp change was not approved", "Your change was not approved", [
        { type: "paragraph", text: `The change you requested for ${email.dapp.name} was not approved. The reviewer wrote:` },
        { type: "quote", text: email.reason },
        { type: "paragraph", text: "Your dApp keeps its current settings. You can request a new change from the console." },
        { type: "link", label: "Open the NEAR Auth Console", href: ownerUrl(context) },
    ]);
}

/**
 * Renders the email that an admin edited the dApp.
 * @param email The email.
 * @param context The email context.
 * @returns The rendered email.
 */
function changedByAdminEmail(email: EmailOf<typeof EmailTemplate.CHANGED_BY_ADMIN>, context: EmailContext): RenderedEmail {
    return renderLayout("The NEAR Auth team updated your dApp", "Your dApp was updated", [
        {
            type: "paragraph",
            text: `The NEAR Auth team updated the settings of ${email.dapp.name}. Review the current values in the console.`,
        },
        { type: "link", label: "Open the NEAR Auth Console", href: ownerUrl(context) },
    ]);
}

/**
 * Renders the email that an admin removed the dApp, quoting the reason.
 * @param email The email.
 * @param context The email context.
 * @returns The rendered email.
 */
function removedByAdminEmail(email: EmailOf<typeof EmailTemplate.REMOVED_BY_ADMIN>, context: EmailContext): RenderedEmail {
    return renderLayout("Your dApp was removed from NEAR Auth", "Your dApp was removed", [
        { type: "paragraph", text: `The NEAR Auth team removed ${email.dapp.name}. The reason given:` },
        { type: "quote", text: email.reason },
        { type: "paragraph", text: "You can submit a new dApp from the console." },
        { type: "link", label: "Open the NEAR Auth Console", href: ownerUrl(context) },
    ]);
}

export const ADMIN_ALERTS: Record<AdminAlertKind, { subject: string; heading: string; body: string }> = {
    [DappEventType.SUBMITTED]: {
        subject: "New dApp submission to review",
        heading: "New dApp submission",
        body: "was submitted and is waiting for review.",
    },
    [DappEventType.AUTO_APPROVED]: {
        subject: "A dApp was auto-approved",
        heading: "A dApp was auto-approved",
        body: "was approved automatically and got an Auth0 client.",
    },
    [DappEventType.RESUBMITTED]: {
        subject: "A dApp was resubmitted for review",
        heading: "A dApp was resubmitted",
        body: "was resubmitted after a rejection and is waiting for review again.",
    },
    [DappEventType.CHANGE_REQUESTED]: {
        subject: "A dApp change request to review",
        heading: "New change request",
        body: "has a change request that is waiting for review.",
    },
};

/**
 * Renders an admin alert with the owner's email and a link to the review page.
 * @param email The email.
 * @param context The email context.
 * @returns The rendered email.
 */
function adminAlertEmail(email: EmailOf<typeof EmailTemplate.ADMIN_ALERT>, context: EmailContext): RenderedEmail {
    const alert = ADMIN_ALERTS[email.kind];
    return renderLayout(alert.subject, alert.heading, [
        { type: "paragraph", text: `${email.dapp.name} (owner ${email.dapp.ownerEmail}) ${alert.body}` },
        { type: "link", label: "Review it in the console", href: adminDappUrl(context.publicUrl, email.dapp.id) },
    ]);
}

/**
 * Renders an email with the template it names.
 * @param email The email.
 * @param context The email context.
 * @returns The subject, HTML and text.
 */
export function renderEmail(email: ConsoleEmail, context: EmailContext): RenderedEmail {
    switch (email.template) {
        case EmailTemplate.DAPP_APPROVED:
            return dappApprovedEmail(email, context);
        case EmailTemplate.DAPP_REJECTED:
            return dappRejectedEmail(email, context);
        case EmailTemplate.CHANGE_APPROVED:
            return changeApprovedEmail(email, context);
        case EmailTemplate.CHANGE_REJECTED:
            return changeRejectedEmail(email, context);
        case EmailTemplate.CHANGED_BY_ADMIN:
            return changedByAdminEmail(email, context);
        case EmailTemplate.REMOVED_BY_ADMIN:
            return removedByAdminEmail(email, context);
        case EmailTemplate.ADMIN_ALERT:
            return adminAlertEmail(email, context);
    }
}
