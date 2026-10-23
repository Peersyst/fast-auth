import type { NearNetwork } from "../../../config/console-config";
import type { EmailTemplate } from "../../../domain/dapp-event";
import type { AdminAlertKind, ConsoleEmail } from "../emailer";
import { renderLayout } from "./layout";
import type { RenderedEmail } from "./layout";

export type EmailContext = {
    publicUrl: string;
    nearNetwork: NearNetwork;
};

type EmailOf<T extends EmailTemplate> = Extract<ConsoleEmail, { template: T }>;

const ownerUrl = (context: EmailContext): string => `${context.publicUrl}/`;

export const adminDappUrl = (publicUrl: string, dappId: string): string => `${publicUrl}/admin/dapps/${encodeURIComponent(dappId)}`;

const AUTHENTICATE_USERS_GUIDE_URL = "https://docs.auth.near.org/home/guides/authenticate-users";

function dappApprovedEmail(email: EmailOf<"dapp_approved">, context: EmailContext): RenderedEmail {
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
        { type: "link", label: "Read the authentication guide", href: AUTHENTICATE_USERS_GUIDE_URL },
        { type: "link", label: "Open the NEAR Auth Console", href: ownerUrl(context) },
    ]);
}

function dappRejectedEmail(email: EmailOf<"dapp_rejected">, context: EmailContext): RenderedEmail {
    return renderLayout("Your dApp needs changes before approval", "Your dApp needs changes", [
        { type: "paragraph", text: `${email.dapp.name} needs changes before it can be approved. The reviewer wrote:` },
        { type: "quote", text: email.reason },
        { type: "paragraph", text: "Edit your dApp in the console to address this. Saving your changes resubmits it for review." },
        { type: "link", label: "Edit your dApp", href: ownerUrl(context) },
    ]);
}

function changeApprovedEmail(email: EmailOf<"change_approved">, context: EmailContext): RenderedEmail {
    return renderLayout("Your dApp change is approved", "Your change is approved", [
        { type: "paragraph", text: `The change you requested for ${email.dapp.name} is approved and now live.` },
        { type: "link", label: "Open the NEAR Auth Console", href: ownerUrl(context) },
    ]);
}

function changeRejectedEmail(email: EmailOf<"change_rejected">, context: EmailContext): RenderedEmail {
    return renderLayout("Your dApp change was not approved", "Your change was not approved", [
        { type: "paragraph", text: `The change you requested for ${email.dapp.name} was not approved. The reviewer wrote:` },
        { type: "quote", text: email.reason },
        { type: "paragraph", text: "Your dApp keeps its current settings. You can request a new change from the console." },
        { type: "link", label: "Open the NEAR Auth Console", href: ownerUrl(context) },
    ]);
}

function changedByAdminEmail(email: EmailOf<"changed_by_admin">, context: EmailContext): RenderedEmail {
    return renderLayout("The NEAR Auth team updated your dApp", "Your dApp was updated", [
        {
            type: "paragraph",
            text: `The NEAR Auth team updated the settings of ${email.dapp.name}. Review the current values in the console.`,
        },
        { type: "link", label: "Open the NEAR Auth Console", href: ownerUrl(context) },
    ]);
}

function removedByAdminEmail(email: EmailOf<"removed_by_admin">, context: EmailContext): RenderedEmail {
    return renderLayout("Your dApp was removed from NEAR Auth", "Your dApp was removed", [
        { type: "paragraph", text: `The NEAR Auth team removed ${email.dapp.name}. The reason given:` },
        { type: "quote", text: email.reason },
        { type: "paragraph", text: "You can submit a new dApp from the console." },
        { type: "link", label: "Open the NEAR Auth Console", href: ownerUrl(context) },
    ]);
}

export const ADMIN_ALERTS: Record<AdminAlertKind, { subject: string; heading: string; body: string }> = {
    submitted: {
        subject: "New dApp submission to review",
        heading: "New dApp submission",
        body: "was submitted and is waiting for review.",
    },
    auto_approved: {
        subject: "A dApp was auto-approved",
        heading: "A dApp was auto-approved",
        body: "was approved automatically and got an Auth0 client.",
    },
    resubmitted: {
        subject: "A dApp was resubmitted for review",
        heading: "A dApp was resubmitted",
        body: "was resubmitted after a rejection and is waiting for review again.",
    },
    change_requested: {
        subject: "A dApp change request to review",
        heading: "New change request",
        body: "has a change request that is waiting for review.",
    },
};

function adminAlertEmail(email: EmailOf<"admin_alert">, context: EmailContext): RenderedEmail {
    const alert = ADMIN_ALERTS[email.kind];
    return renderLayout(alert.subject, alert.heading, [
        { type: "paragraph", text: `${email.dapp.name} (owner ${email.dapp.ownerEmail}) ${alert.body}` },
        { type: "link", label: "Review it in the console", href: adminDappUrl(context.publicUrl, email.dapp.id) },
    ]);
}

export function renderEmail(email: ConsoleEmail, context: EmailContext): RenderedEmail {
    switch (email.template) {
        case "dapp_approved":
            return dappApprovedEmail(email, context);
        case "dapp_rejected":
            return dappRejectedEmail(email, context);
        case "change_approved":
            return changeApprovedEmail(email, context);
        case "change_rejected":
            return changeRejectedEmail(email, context);
        case "changed_by_admin":
            return changedByAdminEmail(email, context);
        case "removed_by_admin":
            return removedByAdminEmail(email, context);
        case "admin_alert":
            return adminAlertEmail(email, context);
    }
}
