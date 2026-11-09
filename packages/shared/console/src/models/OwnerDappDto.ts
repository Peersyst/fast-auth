/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DappStatus } from './DappStatus';
import type { MauBracket } from './MauBracket';
import type { SyncedFieldsDto } from './SyncedFieldsDto';
export type OwnerDappDto = {
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
};

