import { DappEventType, isDappEventDetails } from "./dapp-event";

const PAYLOAD = {
    name: "Acme",
    description: "A wallet",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    callbackUrls: ["https://acme.xyz/callback"],
    logoutUrls: [],
    webOrigins: ["https://acme.xyz"],
};

const CHANGES = [
    { field: "name", before: "Acme", after: "Acme Wallet" },
    { field: "description", before: "A wallet", after: "A NEAR wallet" },
    { field: "logoUrl", before: "https://cdn.acme.xyz/logo.png", after: "https://cdn.acme.xyz/logo-2.png" },
    { field: "callbackUrls", before: [], after: ["https://acme.xyz/callback"] },
    { field: "logoutUrls", before: [], after: ["https://acme.xyz/"] },
    { field: "webOrigins", before: ["https://acme.xyz"], after: ["https://acme.xyz", "https://app.acme.xyz"] },
    { field: "contactEmail" },
    { field: "mauBracket", before: "lt1k", after: "gt25k" },
];

const VALID: { type: DappEventType; details: unknown }[] = [
    { type: "submitted", details: { chosenForAutoApproval: false } },
    { type: "submitted", details: { chosenForAutoApproval: true } },
    { type: "edited", details: { changes: CHANGES } },
    { type: "edited", details: { changes: [] } },
    { type: "resubmitted", details: {} },
    { type: "approved", details: {} },
    { type: "auto_approved", details: {} },
    { type: "rejected", details: { reason: "The logo does not load." } },
    { type: "change_requested", details: { changes: CHANGES } },
    { type: "change_withdrawn", details: {} },
    { type: "change_approved", details: { changes: CHANGES } },
    { type: "change_rejected", details: { reason: "The new callback is not yours." } },
    { type: "owner_changed", details: {} },
    { type: "removed", details: {} },
    { type: "removed", details: { reason: "Abandoned by its owner." } },
    { type: "auth0_created", details: { clientId: "abc", payload: PAYLOAD } },
    { type: "auth0_updated", details: { clientId: "abc", payload: PAYLOAD } },
    { type: "auth0_deleted", details: { clientId: "abc" } },
    { type: "auth0_failed", details: { op: "create", error: "timeout" } },
    { type: "auth0_failed", details: { op: "delete", error: "tag_mismatch", clientId: "abc" } },
    { type: "auth0_failed", details: { op: "find", error: "timeout" } },
    { type: "auth0_failed", details: { op: "update", error: "502", clientId: "abc" } },
    { type: "email_sent", details: { template: "dapp_approved" } },
    { type: "email_sent", details: { template: "dapp_rejected" } },
    { type: "email_sent", details: { template: "change_approved" } },
    { type: "email_sent", details: { template: "change_rejected" } },
    { type: "email_sent", details: { template: "changed_by_admin" } },
    { type: "email_sent", details: { template: "removed_by_admin" } },
    { type: "email_failed", details: { template: "admin_alert", error: "MessageRejected" } },
];

const INVALID: { type: string; details: unknown }[] = [
    { type: "unknown", details: {} },
    { type: "toString", details: {} },
    { type: "approved", details: { constructor: 1 } },
    { type: "approved", details: null },
    { type: "approved", details: [] },
    { type: "approved", details: "{}" },
    { type: "submitted", details: {} },
    { type: "submitted", details: { chosenForAutoApproval: "yes" } },
    { type: "edited", details: {} },
    { type: "edited", details: { changes: "name" } },
    { type: "edited", details: { changes: ["name"] } },
    { type: "edited", details: { changes: [{ field: "owner", before: "a", after: "b" }] } },
    { type: "edited", details: { changes: [{ field: "name", before: "a" }] } },
    { type: "edited", details: { changes: [{ field: "name", before: 1, after: "b" }] } },
    { type: "edited", details: { changes: [{ field: "callbackUrls", before: [], after: [1] }] } },
    { type: "rejected", details: {} },
    { type: "change_requested", details: { changes: [{}] } },
    { type: "change_approved", details: { changes: null } },
    { type: "change_rejected", details: { reason: 42 } },
    { type: "removed", details: { reason: null } },
    { type: "auth0_created", details: { clientId: "abc" } },
    { type: "auth0_created", details: { payload: PAYLOAD } },
    { type: "auth0_updated", details: { clientId: "abc", payload: { ...PAYLOAD, name: 1 } } },
    { type: "auth0_updated", details: { clientId: "abc", payload: { ...PAYLOAD, description: null } } },
    { type: "auth0_updated", details: { clientId: "abc", payload: { ...PAYLOAD, logoUrl: undefined } } },
    { type: "auth0_updated", details: { clientId: "abc", payload: { ...PAYLOAD, callbackUrls: "https://acme.xyz" } } },
    { type: "auth0_updated", details: { clientId: "abc", payload: { ...PAYLOAD, logoutUrls: null } } },
    { type: "auth0_updated", details: { clientId: "abc", payload: { ...PAYLOAD, webOrigins: [null] } } },
    { type: "auth0_deleted", details: {} },
    { type: "auth0_failed", details: { op: "patch", error: "timeout" } },
    { type: "auth0_failed", details: { op: "create" } },
    { type: "auth0_failed", details: { op: "update", error: "timeout", clientId: 7 } },
    { type: "email_sent", details: { template: "welcome" } },
    { type: "email_failed", details: { template: "dapp_rejected" } },
    { type: "email_failed", details: { template: "welcome", error: "MessageRejected" } },
    { type: "edited", details: { changes: [{ field: "contactEmail", before: "old@acme.xyz", after: "new@acme.xyz" }] } },
    { type: "approved", details: { email: "owner@acme.xyz" } },
    { type: "resubmitted", details: { email: "owner@acme.xyz" } },
    { type: "auto_approved", details: { email: "owner@acme.xyz" } },
    { type: "change_withdrawn", details: { email: "owner@acme.xyz" } },
    { type: "owner_changed", details: { email: "owner@acme.xyz" } },
    { type: "submitted", details: { chosenForAutoApproval: true, email: "owner@acme.xyz" } },
    { type: "edited", details: { changes: [], email: "owner@acme.xyz" } },
    { type: "edited", details: { changes: [{ field: "name", before: "a", after: "b", email: "owner@acme.xyz" }] } },
    { type: "rejected", details: { reason: "The logo does not load.", email: "owner@acme.xyz" } },
    { type: "removed", details: { reason: "Abandoned by its owner.", email: "owner@acme.xyz" } },
    { type: "auth0_created", details: { clientId: "abc", payload: PAYLOAD, email: "owner@acme.xyz" } },
    { type: "auth0_deleted", details: { clientId: "abc", email: "owner@acme.xyz" } },
    { type: "auth0_failed", details: { op: "create", error: "timeout", email: "owner@acme.xyz" } },
    { type: "email_sent", details: { template: "dapp_approved", email: "owner@acme.xyz" } },
    { type: "email_failed", details: { template: "admin_alert", error: "MessageRejected", email: "owner@acme.xyz" } },
    { type: "auth0_created", details: { clientId: "abc", payload: { ...PAYLOAD, contactEmail: "dev@acme.xyz" } } },
];

describe("isDappEventDetails", () => {
    it("has a valid sample for every event type", () => {
        expect(new Set(VALID.map((row) => row.type))).toEqual(new Set(Object.values(DappEventType)));
    });

    it.each(VALID)("accepts $type with $details", (row) => {
        expect(isDappEventDetails(row)).toBe(true);
    });

    it.each(INVALID)("refuses $type with $details", (row) => {
        expect(isDappEventDetails(row)).toBe(false);
    });

    it("narrows a row to the member its type names", () => {
        const row: { id: number; type: string; details: unknown } = {
            id: 1,
            type: "auth0_failed",
            details: { op: "update", error: "502" },
        };
        if (!isDappEventDetails(row) || row.type !== "auth0_failed") throw new Error("expected an auth0_failed row");
        const details: { op: string; error: string; clientId?: string } = row.details;
        expect(details.op).toBe("update");
    });
});
