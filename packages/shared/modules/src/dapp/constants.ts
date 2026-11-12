import { DappField, MauBracket } from "./types";

export const MAU_LABELS: Record<MauBracket, string> = {
    [MauBracket.LT_1K]: "Less than 1,000",
    [MauBracket.FROM_1K_TO_10K]: "1,000 – 10,000",
    [MauBracket.FROM_10K_TO_25K]: "10,000 – 25,000",
    [MauBracket.GT_25K]: "More than 25,000",
};

export const FIELD_LABELS: Record<DappField, string> = {
    name: "Name",
    description: "Description",
    logoUrl: "Logo",
    mauBracket: "Expected MAU",
    callbackUrls: "Callback URLs",
    logoutUrls: "Logout URLs",
    webOrigins: "Web origins",
    contactEmail: "Contact",
};

export const NAME_MAX_LENGTH = 64;
/** Auth0's limit for a client description. */
export const DESCRIPTION_MAX_LENGTH = 140;
/** Auth0's limit for `client_metadata` values. */
export const LOGO_URL_MAX_LENGTH = 255;
export const MAX_PAGE = 10_000;
