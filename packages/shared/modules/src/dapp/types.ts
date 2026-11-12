export const DappStatus = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    REMOVED: "removed",
} as const;

export type DappStatus = (typeof DappStatus)[keyof typeof DappStatus];

export const MauBracket = {
    LT_1K: "lt1k",
    FROM_1K_TO_10K: "1k_10k",
    FROM_10K_TO_25K: "10k_25k",
    GT_25K: "gt25k",
} as const;

export type MauBracket = (typeof MauBracket)[keyof typeof MauBracket];

export const DappAction = {
    EDIT: "edit",
    ADMIN_EDIT: "adminEdit",
    APPROVE: "approve",
    REJECT: "reject",
    APPROVE_CHANGE: "approveChange",
    REJECT_CHANGE: "rejectChange",
    REMOVE: "remove",
} as const;

export type DappAction = (typeof DappAction)[keyof typeof DappAction];

export const DappEventType = {
    SUBMITTED: "submitted",
    EDITED: "edited",
    RESUBMITTED: "resubmitted",
    APPROVED: "approved",
    AUTO_APPROVED: "auto_approved",
    REJECTED: "rejected",
    CHANGE_REQUESTED: "change_requested",
    CHANGE_WITHDRAWN: "change_withdrawn",
    CHANGE_APPROVED: "change_approved",
    CHANGE_REJECTED: "change_rejected",
    REMOVED: "removed",
    AUTH0_CREATED: "auth0_created",
    AUTH0_UPDATED: "auth0_updated",
    AUTH0_DELETED: "auth0_deleted",
    AUTH0_FAILED: "auth0_failed",
} as const;

export type DappEventType = (typeof DappEventType)[keyof typeof DappEventType];

export const ActorRole = {
    USER: "user",
    ADMIN: "admin",
    SYSTEM: "system",
} as const;

export type ActorRole = (typeof ActorRole)[keyof typeof ActorRole];

export const Auth0Op = {
    FIND: "find",
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
} as const;

export type Auth0Op = (typeof Auth0Op)[keyof typeof Auth0Op];

/** The fields that sync to the dApp's Auth0 client. */
export interface SyncedFields {
    name: string;
    description: string;
    logoUrl: string;
    callbackUrls: string[];
    logoutUrls: string[];
    webOrigins: string[];
}

/** The fields an owner submits. An approved dApp's owner changes them only through a reviewed change. */
export interface DappFields extends SyncedFields {
    contactEmail: string;
    mauBracket: MauBracket;
}

export type DappField = keyof DappFields;

export type FieldValue = string | string[];

/** The contact email's values are personal data, so a change records only that it changed. */
export type FieldChange = { field: Exclude<DappField, "contactEmail">; before: FieldValue; after: FieldValue } | { field: "contactEmail" };

export type FieldValueChange = Extract<FieldChange, { before: FieldValue }>;

type NoDetails = Record<string, never>;
type ChangesDetails = { changes: FieldChange[] };
type Auth0WriteDetails = { clientId: string; payload: SyncedFields };

export type DappEventPayloads = {
    [DappEventType.SUBMITTED]: { chosenForAutoApproval: boolean };
    [DappEventType.EDITED]: ChangesDetails;
    [DappEventType.RESUBMITTED]: NoDetails;
    [DappEventType.APPROVED]: NoDetails;
    [DappEventType.AUTO_APPROVED]: NoDetails;
    [DappEventType.REJECTED]: NoDetails;
    [DappEventType.CHANGE_REQUESTED]: ChangesDetails;
    [DappEventType.CHANGE_WITHDRAWN]: NoDetails;
    [DappEventType.CHANGE_APPROVED]: ChangesDetails;
    [DappEventType.CHANGE_REJECTED]: NoDetails;
    [DappEventType.REMOVED]: NoDetails;
    [DappEventType.AUTH0_CREATED]: Auth0WriteDetails;
    [DappEventType.AUTH0_UPDATED]: Auth0WriteDetails;
    [DappEventType.AUTH0_DELETED]: { clientId: string };
    [DappEventType.AUTH0_FAILED]: { op: Auth0Op; error: string; clientId?: string };
};

export type DappEventDetails = { [T in DappEventType]: { type: T; details: DappEventPayloads[T] } }[DappEventType];
