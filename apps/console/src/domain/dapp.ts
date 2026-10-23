import { z } from "zod";

export type DappId = string & { readonly __brand: "DappId" };
export type Auth0ClientId = string & { readonly __brand: "Auth0ClientId" };

export const DappStatus = {
    Pending: "pending",
    Approved: "approved",
    Rejected: "rejected",
    Removed: "removed",
} as const;
export type DappStatus = (typeof DappStatus)[keyof typeof DappStatus];

export const MauBracket = {
    Lt1k: "lt1k",
    From1kTo10k: "1k_10k",
    From10kTo25k: "10k_25k",
    Gt25k: "gt25k",
} as const;
export type MauBracket = (typeof MauBracket)[keyof typeof MauBracket];

export const syncedFieldsSchema = z.strictObject({
    name: z.string(),
    description: z.string(),
    logoUrl: z.string(),
    callbackUrls: z.array(z.string()),
    logoutUrls: z.array(z.string()),
    webOrigins: z.array(z.string()),
});
export type SyncedFields = z.infer<typeof syncedFieldsSchema>;
export const SYNCED_FIELDS: readonly (keyof SyncedFields)[] = syncedFieldsSchema.keyof().options;

const directFieldsSchema = z.strictObject({ contactEmail: z.string(), mauBracket: z.enum(MauBracket) });
type DirectFields = z.infer<typeof directFieldsSchema>;
export const DIRECT_FIELDS: readonly (keyof DirectFields)[] = directFieldsSchema.keyof().options;

export type DappFields = SyncedFields & DirectFields;
export type DappField = keyof DappFields;

export const DAPP_FIELDS = [...SYNCED_FIELDS, ...DIRECT_FIELDS] as const;

export function syncedFieldsOf(fields: SyncedFields): SyncedFields {
    const { name, description, logoUrl, callbackUrls, logoutUrls, webOrigins } = fields;
    return { name, description, logoUrl, callbackUrls, logoutUrls, webOrigins };
}

export type Dapp = DappFields & {
    id: DappId;
    ownerEmail: string;
    status: DappStatus;
    rejectionReason: string | null;
    pendingChange: SyncedFields | null;
    pendingChangeAt: Date | null;
    auth0ClientId: Auth0ClientId | null;
    auth0SyncedAt: Date | null;
    auth0Error: string | null;
    submittedAt: Date;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    removedAt: Date | null;
    removedBy: string | null;
    removalReason: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
};
