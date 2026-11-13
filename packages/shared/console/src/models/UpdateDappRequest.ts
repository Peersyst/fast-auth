/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MauBracket } from './MauBracket';
export type UpdateDappRequest = {
    /**
     * The dApp's name.
     */
    name?: string;
    /**
     * A short description of the dApp.
     */
    description?: string;
    /**
     * The URL of the dApp's logo.
     */
    logoUrl?: string;
    /**
     * The expected monthly active users.
     */
    mauBracket?: MauBracket;
    /**
     * The URLs Auth0 may redirect to after login.
     */
    callbackUrls?: Array<string>;
    /**
     * The URLs Auth0 may redirect to after logout.
     */
    logoutUrls?: Array<string>;
    /**
     * The origins allowed to sign in from the browser.
     */
    webOrigins?: Array<string>;
    /**
     * The email address to contact the dApp's team.
     */
    contactEmail?: string;
};

