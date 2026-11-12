/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
     * The error of the last failed Auth0 call, null once an Auth0 write succeeds.
     */
    auth0Error: string | null;
    /**
     * Null until an admin or auto-approval reviews the dApp.
     */
    reviewedAt: string | null;
    createdAt: string;
};

