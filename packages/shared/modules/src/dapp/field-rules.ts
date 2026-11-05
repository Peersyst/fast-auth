import { DESCRIPTION_MAX_LENGTH, LOGO_URL_MAX_LENGTH, NAME_MAX_LENGTH } from "./constants";

const URL_MAX_LENGTH = 2048;
const EMAIL_MAX_LENGTH = 254;

/** Whitespace, backslashes and control characters, which the URL parser can drop or rewrite; invisible format characters such as direction overrides; and lone surrogates. */
const UNSAFE_URL_CHARACTERS = /[\s\\\p{Cc}\p{Cf}\p{Cs}]/u;

/** Hidden characters, the braille blank and the null notehead among them, and private-use characters, which each font draws differently. Auth0's login screen would show them in a name nobody may have reviewed. A few stay where they change how their neighbours render: ZWNJ between letters (Persian), ZWJ between a combining mark and a letter (Sinhala and Indic conjuncts), between a letter and a mark (Bengali ya-phala) or between emoji, a presentation selector after an emoji or inside a keycap, and a variation selector after an ideograph. */
const HIDDEN_NAME_CHARACTER =
    /(?!(?<=\p{L}\p{M}*)\u200C(?=\p{L})|(?<=\p{L}\p{M}+)\u200D(?=\p{L})|(?<=\p{L})\u200D(?=\p{M})|(?<=\p{Extended_Pictographic}[\p{Emoji_Modifier}\uFE0F]?)\u200D(?=\p{Extended_Pictographic})|(?<=\p{Extended_Pictographic})[\uFE0E\uFE0F]|(?<=[0-9#*])\uFE0F(?=\u20E3)|(?<=\p{Ideographic})[\uFE00-\uFE0D\u{E0100}-\u{E01EF}])[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\p{Co}\u2800\u{1D159}]/u;
/** The flags of England, Scotland and Wales, the only tag sequences platforms draw. Any other run of tags is hidden text. */
const SUBDIVISION_FLAG =
    /\u{1F3F4}\u{E0067}\u{E0062}(?:\u{E0065}\u{E006E}\u{E0067}|\u{E0073}\u{E0063}\u{E0074}|\u{E0077}\u{E006C}\u{E0073})\u{E007F}/gu;
const VISIBLE_CHARACTER = /[\p{L}\p{N}\p{P}\p{S}]/u;
const UNSAFE_DESCRIPTION_CHARACTERS = /(?![\t\n\r])\p{Cc}|[\u202A-\u202E\u2066-\u2069\p{Cs}]/u;

const HOST_LABEL = /^[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?$/;
/** Special-use and local-network names, which resolve on the visitor's own network or nowhere. A public name that resolves to a private address still passes, as catching it needs a DNS lookup. */
const LOCAL_HOST = /(?:^|\.)(?:localhost|local|internal|lan|home|corp|home\.arpa|localdomain|test|invalid|example)\.?$/;

const EMAIL =
    /^(?:[A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+(?:[A-Za-z]{2,}|[Xx][Nn]--[A-Za-z0-9-]*[A-Za-z0-9])$/;

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
 * Parses an https URL, or gives null when it is too long, holds unsafe characters, or has credentials or an authority the parser would rewrite.
 * @param value The normalised URL.
 * @returns The parsed URL, or null.
 */
function parseHttpsUrl(value: string): URL | null {
    if (value.length > URL_MAX_LENGTH || UNSAFE_URL_CHARACTERS.test(value)) return null;
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    const prefix = `https://${url.host}`;
    return value.startsWith(prefix) && /^(?:[/?#]|$)/.test(value.slice(prefix.length)) ? url : null;
}

/**
 * Accepts only dotted DNS names outside the local and special-use zones, so IP addresses fail.
 * @param url The parsed URL.
 * @returns Whether the host is public.
 */
function isPublicHost(url: URL): boolean {
    const { hostname } = url;
    const isIpv4 = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    const labels = hostname.replace(/\.$/, "").split(".");
    return !isIpv4 && labels.length >= 2 && labels.every((label) => HOST_LABEL.test(label)) && !LOCAL_HOST.test(hostname);
}

/**
 * Accepts a public https URL with no fragment, once normalised.
 * @param value The URL as entered.
 * @returns Whether it is a valid callback or logout URL.
 */
export function isCallbackUrl(value: string): boolean {
    const normalised = normaliseUrl(value);
    const url = parseHttpsUrl(normalised);
    return url !== null && !normalised.includes("#") && isPublicHost(url);
}

/**
 * Accepts a public https origin with nothing after the host and port, once normalised.
 * @param value The origin as entered.
 * @returns Whether it is a valid web origin.
 */
export function isWebOrigin(value: string): boolean {
    const normalised = normaliseUrl(value);
    const url = parseHttpsUrl(normalised);
    return url !== null && normalised === url.origin && isPublicHost(url);
}

/**
 * Accepts a public https URL within Auth0's metadata length limit, once normalised.
 * @param value The URL as entered.
 * @returns Whether it is a valid logo URL.
 */
export function isLogoUrl(value: string): boolean {
    const normalised = normaliseUrl(value);
    const url = parseHttpsUrl(normalised);
    return normalised.length <= LOGO_URL_MAX_LENGTH && url !== null && isPublicHost(url);
}

/** NUL, which Postgres `text` cannot store. */
export const NUL = "\u0000";

/**
 * Accepts a name within the length limit, with a visible character and no angle brackets or hidden characters.
 * @param name The dApp name.
 * @returns Whether the name is valid.
 */
export function isValidName(name: string): boolean {
    return (
        name.length <= NAME_MAX_LENGTH &&
        VISIBLE_CHARACTER.test(name) &&
        !/[<>]/.test(name) &&
        !HIDDEN_NAME_CHARACTER.test(name.replace(SUBDIVISION_FLAG, "\u{1F3F4}"))
    );
}

/**
 * Accepts a description within Auth0's limit, with no control characters other than tabs and line breaks, no direction controls and no lone surrogates.
 * @param description The dApp description.
 * @returns Whether the description is valid.
 */
export function isValidDescription(description: string): boolean {
    return description.length <= DESCRIPTION_MAX_LENGTH && !UNSAFE_DESCRIPTION_CHARACTERS.test(description);
}

/**
 * Accepts a plain address on a dotted domain, without quoted parts or IP literals, within the length limit.
 * @param email The email address.
 * @returns Whether the address is valid.
 */
export function isContactEmail(email: string): boolean {
    return email.length <= EMAIL_MAX_LENGTH && EMAIL.test(email);
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
