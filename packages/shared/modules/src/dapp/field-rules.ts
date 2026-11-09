import isEmail from "validator/lib/isEmail";
import isFQDN from "validator/lib/isFQDN";
import isURL from "validator/lib/isURL";
import { DESCRIPTION_MAX_LENGTH, LOGO_URL_MAX_LENGTH, NAME_MAX_LENGTH } from "./constants";

const URL_MAX_LENGTH = 2048;
const EMAIL_MAX_LENGTH = 254;

const HOST_OPTIONS = { allow_underscores: true, allow_trailing_dot: true };

const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * Trims the URL and lowercases its scheme and authority, leaving the path, query and fragment as typed.
 * @param value The URL.
 * @returns The normalised URL.
 */
export function normaliseUrl(value: string): string {
    return value.trim().replace(/^[^/?#]*\/\/[^/?#]*/, (schemeAndAuthority) => schemeAndAuthority.toLowerCase());
}

/**
 * Normalises each URL and drops duplicates, keeping the first-seen order.
 * @param values The URLs.
 * @returns The normalised, unique URLs.
 */
export function normaliseUrlList(values: readonly string[]): string[] {
    return [...new Set(values.map(normaliseUrl))];
}

/**
 * Accepts an https URL on a public DNS name, so IP addresses and single-label hosts fail. A backslash fails because browsers read it as a slash, and an authority the URL parser would rewrite fails too.
 * @param value The normalised URL.
 * @param allowFragment Whether the URL may have a fragment.
 * @returns Whether the URL is valid.
 */
function isPublicHttpsUrl(value: string, allowFragment: boolean): boolean {
    return (
        value.length <= URL_MAX_LENGTH &&
        !CONTROL_CHARACTER.test(value) &&
        !value.includes("\\") &&
        isURL(value, {
            protocols: ["https"],
            require_protocol: true,
            disallow_auth: true,
            allow_fragments: allowFragment,
            ...HOST_OPTIONS,
        }) &&
        URL.canParse(value) &&
        isFQDN(new URL(value).hostname, HOST_OPTIONS) &&
        value.startsWith(`https://${new URL(value).host}`)
    );
}

/**
 * Accepts a public https URL with no fragment, once normalised.
 * @param value The URL as entered.
 * @returns Whether it is a valid callback or logout URL.
 */
export function isCallbackUrl(value: string): boolean {
    return isPublicHttpsUrl(normaliseUrl(value), false);
}

/**
 * Accepts a public https origin with nothing after the host and port, once normalised.
 * @param value The origin as entered.
 * @returns Whether it is a valid web origin.
 */
export function isWebOrigin(value: string): boolean {
    const normalised = normaliseUrl(value);
    return isPublicHttpsUrl(normalised, false) && normalised === new URL(normalised).origin;
}

/**
 * Accepts a public https URL within Auth0's metadata length limit, once normalised.
 * @param value The URL as entered.
 * @returns Whether it is a valid logo URL.
 */
export function isLogoUrl(value: string): boolean {
    const normalised = normaliseUrl(value);
    return normalised.length <= LOGO_URL_MAX_LENGTH && isPublicHttpsUrl(normalised, true);
}

/** NUL, which Postgres `text` cannot store. */
export const NUL = "\u0000";

/**
 * Accepts a non-blank name within the length limit, with no angle brackets or control characters.
 * @param name The dApp name.
 * @returns Whether the name is valid.
 */
export function isValidName(name: string): boolean {
    return name.length <= NAME_MAX_LENGTH && name.trim() !== "" && !/[<>]/.test(name) && !CONTROL_CHARACTER.test(name);
}

/**
 * Accepts a description within Auth0's limit, with no control characters other than tabs and line breaks.
 * @param description The dApp description.
 * @returns Whether the description is valid.
 */
export function isValidDescription(description: string): boolean {
    return description.length <= DESCRIPTION_MAX_LENGTH && !CONTROL_CHARACTER.test(description.replace(/[\t\n\r]/g, ""));
}

/**
 * Accepts an email address within the length limit.
 * @param email The email address.
 * @returns Whether the address is valid.
 */
export function isContactEmail(email: string): boolean {
    return email.length <= EMAIL_MAX_LENGTH && isEmail(email);
}

export const URL_LIST_RULES = {
    callbackUrls: { min: 1, max: 10, isValid: isCallbackUrl },
    logoutUrls: { min: 0, max: 10, isValid: isCallbackUrl },
    webOrigins: { min: 1, max: 10, isValid: isWebOrigin },
} as const;
export type UrlListField = keyof typeof URL_LIST_RULES;

/**
 * Normalises and deduplicates the list, then checks its size against the field's bounds and each URL against the field's rule.
 * @param field The URL list field.
 * @param values The URLs as entered.
 * @returns Whether the list is valid.
 */
export function isValidUrlList(field: UrlListField, values: readonly string[]): boolean {
    const { min, max, isValid } = URL_LIST_RULES[field];
    const list = normaliseUrlList(values);
    return list.length >= min && list.length <= max && list.every(isValid);
}
