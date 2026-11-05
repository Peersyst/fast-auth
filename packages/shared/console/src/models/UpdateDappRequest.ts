/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MauBracket } from './MauBracket';
export type UpdateDappRequest = {
    /**
     * 1–64 UTF-16 code units once trimmed (most emoji count as two or more), no `<` or `>`.
     */
    name: string;
    /**
     * At most 140 UTF-16 code units once trimmed; may be empty.
     */
    description: string;
    /**
     * An `https:` URL of at most 255 characters.
     */
    logoUrl: string;
    mauBracket: MauBracket;
    /**
     * 1–10 absolute `https:` URLs once de-duplicated.
     */
    callbackUrls: Array<string>;
    /**
     * 0–10 absolute `https:` URLs once de-duplicated.
     */
    logoutUrls: Array<string>;
    /**
     * 1–10 `https://host[:port]` origins once de-duplicated.
     */
    webOrigins: Array<string>;
    contactEmail: string;
    expectedVersion: number;
};

