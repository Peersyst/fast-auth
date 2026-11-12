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

/** The fields that sync to the dApp's Auth0 client. */
export interface SyncedFields {
    name: string;
    description: string;
    logoUrl: string;
    callbackUrls: string[];
    logoutUrls: string[];
    webOrigins: string[];
}

/** The fields an owner submits. */
export interface DappFields extends SyncedFields {
    contactEmail: string;
    mauBracket: MauBracket;
}

export type DappField = keyof DappFields;
