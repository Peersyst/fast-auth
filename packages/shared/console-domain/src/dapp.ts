import { z } from "zod";

export type DappId = string & { readonly __brand: "DappId" };
export type Auth0ClientId = string & { readonly __brand: "Auth0ClientId" };

export enum DappStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    REMOVED = "removed",
}

/** What the anonymiser writes over every personal field of an erased dApp. */
export const ERASED = "erased";

export enum MauBracket {
    LT_1K = "lt1k",
    FROM_1K_TO_10K = "1k_10k",
    FROM_10K_TO_25K = "10k_25k",
    GT_25K = "gt25k",
}

export const MAU_LABELS: Record<MauBracket, string> = {
    lt1k: "Less than 1,000",
    "1k_10k": "1,000 – 10,000",
    "10k_25k": "10,000 – 25,000",
    gt25k: "More than 25,000",
};

export const FIELD_LABELS: Record<DappField, string> = {
    name: "Name",
    description: "Description",
    logoUrl: "Logo",
    mauBracket: "Expected MAU",
    callbackUrls: "Callback URLs",
    logoutUrls: "Logout URLs",
    webOrigins: "Web origins",
    contactEmail: "Contact",
};

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

/**
 * Copies only the fields that sync to Auth0, dropping any others the object carries.
 * @param fields An object that holds the synced fields.
 * @returns A new object with only the synced fields.
 */
export function syncedFieldsOf(fields: SyncedFields): SyncedFields {
    const { name, description, logoUrl, callbackUrls, logoutUrls, webOrigins } = fields;
    return { name, description, logoUrl, callbackUrls, logoutUrls, webOrigins };
}

/**
 * Copies only the fields an owner may change without review, dropping any others the object carries.
 * @param fields An object that holds the direct fields.
 * @returns A new object with only the direct fields.
 */
export function directFieldsOf(fields: DirectFields): DirectFields {
    const { contactEmail, mauBracket } = fields;
    return { contactEmail, mauBracket };
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

/**
 * Reads an approved dApp's Auth0 client id, throwing when it has none.
 * @param dapp The approved dApp.
 * @returns The client id.
 */
export function clientIdOf(dapp: Dapp): Auth0ClientId {
    if (dapp.auth0ClientId === null) throw new Error(`Approved dApp ${dapp.id} has no Auth0 client`);
    return dapp.auth0ClientId;
}
