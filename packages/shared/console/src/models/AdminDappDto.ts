/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DappFieldsDto } from './DappFieldsDto';
import type { DappStatus } from './DappStatus';
import type { MauBracket } from './MauBracket';
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
    pendingChange: DappFieldsDto | null;
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
     * The last Auth0 error, cleared by the next successful Auth0 write.
     */
    auth0Error: string | null;
    removedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

