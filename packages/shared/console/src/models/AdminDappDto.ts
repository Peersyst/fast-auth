/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DappStatus } from './DappStatus';
import type { MauBracket } from './MauBracket';
import type { SyncedFieldsDto } from './SyncedFieldsDto';
export type AdminDappDto = {
    id: string;
    name: string;
    description: string;
    logoUrl: string;
    mauBracket: MauBracket;
    callbackUrls: Array<string>;
    logoutUrls: Array<string>;
    webOrigins: Array<string>;
    contactEmail: string;
    status: DappStatus;
    rejectionReason: string | null;
    pendingChange: SyncedFieldsDto | null;
    pendingChangeAt: string | null;
    /**
     * Null until the dApp is provisioned.
     */
    auth0ClientId: string | null;
    /**
     * Send it back as `expectedVersion` with the next change.
     */
    version: number;
    submittedAt: string;
    ownerEmail: string;
    reviewedAt: string | null;
    /**
     * Null until an admin reviews it. Stays null after auto-approval.
     */
    reviewedBy: string | null;
    /**
     * The last Auth0 error, cleared by the next successful Auth0 write.
     */
    auth0Error: string | null;
    auth0SyncedAt: string | null;
    removedAt: string | null;
    removedBy: string | null;
    removalReason: string | null;
    createdAt: string;
    updatedAt: string;
};

