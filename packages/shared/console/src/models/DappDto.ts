/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DappChangeDto } from './DappChangeDto';
import type { DappStatus } from './DappStatus';
import type { MauBracket } from './MauBracket';
export type DappDto = {
    id: string;
    ownerEmail: string;
    name: string;
    description: string;
    logoUrl: string;
    mauBracket: MauBracket;
    callbackUrls: Array<string>;
    logoutUrls: Array<string>;
    webOrigins: Array<string>;
    contactEmail: string;
    status: DappStatus;
    /**
     * Null until the dApp is approved.
     */
    auth0ClientId: string | null;
    /**
     * Null until an admin reviews the dApp.
     */
    reviewedAt: string | null;
    /**
     * The edit waiting for review. Null when there is none.
     */
    pendingChange: DappChangeDto | null;
    createdAt: string;
};

