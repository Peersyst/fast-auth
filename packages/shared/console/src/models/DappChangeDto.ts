/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * An edit of an approved dApp waiting for review. A null field is one the edit leaves as it is.
 */
export type DappChangeDto = {
    id: string;
    name: string | null;
    description: string | null;
    logoUrl: string | null;
    mauBracket: 'lt1k' | '1k_10k' | '10k_25k' | 'gt25k' | null;
    callbackUrls: Array<string> | null;
    logoutUrls: Array<string> | null;
    webOrigins: Array<string> | null;
    contactEmail: string | null;
    createdAt: string;
};

