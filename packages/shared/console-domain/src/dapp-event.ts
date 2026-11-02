import { z } from "zod";
import type { Auth0ClientId } from "./dapp";
import { DAPP_FIELDS, syncedFieldsSchema } from "./dapp";

export enum DappEventType {
    SUBMITTED = "submitted",
    EDITED = "edited",
    RESUBMITTED = "resubmitted",
    APPROVED = "approved",
    AUTO_APPROVED = "auto_approved",
    REJECTED = "rejected",
    CHANGE_REQUESTED = "change_requested",
    CHANGE_WITHDRAWN = "change_withdrawn",
    CHANGE_APPROVED = "change_approved",
    CHANGE_REJECTED = "change_rejected",
    OWNER_CHANGED = "owner_changed",
    REMOVED = "removed",
    AUTH0_CREATED = "auth0_created",
    AUTH0_UPDATED = "auth0_updated",
    AUTH0_DELETED = "auth0_deleted",
    AUTH0_FAILED = "auth0_failed",
    EMAIL_SENT = "email_sent",
    EMAIL_FAILED = "email_failed",
}

export enum ActorRole {
    USER = "user",
    ADMIN = "admin",
    SYSTEM = "system",
}

export enum Auth0Op {
    FIND = "find",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
}

export enum EmailTemplate {
    DAPP_APPROVED = "dapp_approved",
    DAPP_REJECTED = "dapp_rejected",
    CHANGE_APPROVED = "change_approved",
    CHANGE_REJECTED = "change_rejected",
    CHANGED_BY_ADMIN = "changed_by_admin",
    REMOVED_BY_ADMIN = "removed_by_admin",
    ADMIN_ALERT = "admin_alert",
}

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
    z.object({ type: z.literal(DappEventType.SUBMITTED), details: z.strictObject({ chosenForAutoApproval: z.boolean() }) }),
    z.object({ type: z.literal(DappEventType.EDITED), details: changes }),
    z.object({ type: z.literal(DappEventType.RESUBMITTED), details: noDetails }),
    z.object({ type: z.literal(DappEventType.APPROVED), details: noDetails }),
    z.object({ type: z.literal(DappEventType.AUTO_APPROVED), details: noDetails }),
    z.object({ type: z.literal(DappEventType.REJECTED), details: reason }),
    z.object({ type: z.literal(DappEventType.CHANGE_REQUESTED), details: changes }),
    z.object({ type: z.literal(DappEventType.CHANGE_WITHDRAWN), details: noDetails }),
    z.object({ type: z.literal(DappEventType.CHANGE_APPROVED), details: changes }),
    z.object({ type: z.literal(DappEventType.CHANGE_REJECTED), details: reason }),
    z.object({ type: z.literal(DappEventType.OWNER_CHANGED), details: noDetails }),
    z.object({ type: z.literal(DappEventType.REMOVED), details: z.strictObject({ reason: z.string().exactOptional() }) }),
    z.object({ type: z.literal(DappEventType.AUTH0_CREATED), details: clientAndPayload }),
    z.object({ type: z.literal(DappEventType.AUTH0_UPDATED), details: clientAndPayload }),
    z.object({ type: z.literal(DappEventType.AUTH0_DELETED), details: z.strictObject({ clientId: auth0ClientId }) }),
    z.object({
        type: z.literal(DappEventType.AUTH0_FAILED),
        details: z.strictObject({ op: z.enum(Auth0Op), error: z.string(), clientId: auth0ClientId.exactOptional() }),
    }),
    z.object({ type: z.literal(DappEventType.EMAIL_SENT), details: z.strictObject({ template: z.enum(EmailTemplate) }) }),
    z.object({
        type: z.literal(DappEventType.EMAIL_FAILED),
        details: z.strictObject({ template: z.enum(EmailTemplate), error: z.string() }),
    }),
]);
export type DappEventDetails = z.infer<typeof dappEventDetailsSchema>;
export type DappEventPayloads = { [T in DappEventType]: Extract<DappEventDetails, { type: T }>["details"] };

/**
 * Checks a row's details against the schema for its event type, refusing unknown types and extra detail keys.
 * @param row The event row.
 * @returns Whether the details match the event type.
 */
export function isDappEventDetails<R extends { type: string; details: unknown }>(row: R): row is R & DappEventDetails {
    return dappEventDetailsSchema.safeParse(row).success;
}
