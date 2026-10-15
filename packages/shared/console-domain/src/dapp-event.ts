import { z } from "zod";
import type { Auth0ClientId } from "./dapp";
import { DAPP_FIELDS, syncedFieldsSchema } from "./dapp";

export const DappEventType = {
    Submitted: "submitted",
    Edited: "edited",
    Resubmitted: "resubmitted",
    Approved: "approved",
    AutoApproved: "auto_approved",
    Rejected: "rejected",
    ChangeRequested: "change_requested",
    ChangeWithdrawn: "change_withdrawn",
    ChangeApproved: "change_approved",
    ChangeRejected: "change_rejected",
    OwnerChanged: "owner_changed",
    Removed: "removed",
    Auth0Created: "auth0_created",
    Auth0Updated: "auth0_updated",
    Auth0Deleted: "auth0_deleted",
    Auth0Failed: "auth0_failed",
    EmailSent: "email_sent",
    EmailFailed: "email_failed",
} as const;
export type DappEventType = (typeof DappEventType)[keyof typeof DappEventType];

export const ActorRole = {
    User: "user",
    Admin: "admin",
    System: "system",
} as const;
export type ActorRole = (typeof ActorRole)[keyof typeof ActorRole];

export const Auth0Op = {
    Find: "find",
    Create: "create",
    Update: "update",
    Delete: "delete",
} as const;
export type Auth0Op = (typeof Auth0Op)[keyof typeof Auth0Op];

export const EmailTemplate = {
    DappApproved: "dapp_approved",
    DappRejected: "dapp_rejected",
    ChangeApproved: "change_approved",
    ChangeRejected: "change_rejected",
    ChangedByAdmin: "changed_by_admin",
    RemovedByAdmin: "removed_by_admin",
    AdminAlert: "admin_alert",
} as const;
export type EmailTemplate = (typeof EmailTemplate)[keyof typeof EmailTemplate];

const fieldValueSchema = z.union([z.string(), z.array(z.string())]);
export type FieldValue = z.infer<typeof fieldValueSchema>;

const fieldChangeSchema = z.union([
    z.strictObject({ field: z.enum(DAPP_FIELDS).exclude(["contactEmail"]), before: fieldValueSchema, after: fieldValueSchema }),
    z.strictObject({ field: z.literal("contactEmail") }),
]);
export type FieldChange = z.infer<typeof fieldChangeSchema>;

const auth0ClientId = z.custom<Auth0ClientId>((value) => typeof value === "string");
const noDetails = z.strictObject({});
const changes = z.strictObject({ changes: z.array(fieldChangeSchema) });
const reason = z.strictObject({ reason: z.string() });
const clientAndPayload = z.strictObject({ clientId: auth0ClientId, payload: syncedFieldsSchema });

const dappEventDetailsSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("submitted"), details: z.strictObject({ chosenForAutoApproval: z.boolean() }) }),
    z.object({ type: z.literal("edited"), details: changes }),
    z.object({ type: z.literal("resubmitted"), details: noDetails }),
    z.object({ type: z.literal("approved"), details: noDetails }),
    z.object({ type: z.literal("auto_approved"), details: noDetails }),
    z.object({ type: z.literal("rejected"), details: reason }),
    z.object({ type: z.literal("change_requested"), details: changes }),
    z.object({ type: z.literal("change_withdrawn"), details: noDetails }),
    z.object({ type: z.literal("change_approved"), details: changes }),
    z.object({ type: z.literal("change_rejected"), details: reason }),
    z.object({ type: z.literal("owner_changed"), details: noDetails }),
    z.object({ type: z.literal("removed"), details: z.strictObject({ reason: z.string().exactOptional() }) }),
    z.object({ type: z.literal("auth0_created"), details: clientAndPayload }),
    z.object({ type: z.literal("auth0_updated"), details: clientAndPayload }),
    z.object({ type: z.literal("auth0_deleted"), details: z.strictObject({ clientId: auth0ClientId }) }),
    z.object({
        type: z.literal("auth0_failed"),
        details: z.strictObject({ op: z.enum(Auth0Op), error: z.string(), clientId: auth0ClientId.exactOptional() }),
    }),
    z.object({ type: z.literal("email_sent"), details: z.strictObject({ template: z.enum(EmailTemplate) }) }),
    z.object({ type: z.literal("email_failed"), details: z.strictObject({ template: z.enum(EmailTemplate), error: z.string() }) }),
]);
export type DappEventDetails = z.infer<typeof dappEventDetailsSchema>;
export type DappEventPayloads = { [T in DappEventType]: Extract<DappEventDetails, { type: T }>["details"] };

export function isDappEventDetails<R extends { type: string; details: unknown }>(row: R): row is R & DappEventDetails {
    return dappEventDetailsSchema.safeParse(row).success;
}
