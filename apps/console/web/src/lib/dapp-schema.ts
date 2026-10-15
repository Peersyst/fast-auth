import { z } from "zod";
import {
    DESCRIPTION_MAX_LENGTH,
    isContactEmail,
    isLogoUrl,
    isValidDescription,
    isValidName,
    isValidUrlList,
    LOGO_URL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    normaliseUrl,
    normaliseUrlList,
    URL_LIST_RULES,
    type UrlListField,
} from "../../../src/domain/field-rules";
import type { DappFormFields } from "../api/client";
import { MAU_BRACKETS } from "./dapp-fields";

const URL_RULE = "an https URL on a public host, without a #fragment or credentials";

export const URL_LISTS = {
    callbackUrls: { ...URL_LIST_RULES.callbackUrls, noun: "callback URL", rule: URL_RULE },
    logoutUrls: { ...URL_LIST_RULES.logoutUrls, noun: "logout URL", rule: URL_RULE },
    webOrigins: {
        ...URL_LIST_RULES.webOrigins,
        noun: "web origin",
        rule: "an https origin on a public host, like https://app.example.com, with no path or trailing slash",
    },
} satisfies Record<UrlListField, unknown>;

function listReason(field: UrlListField): string {
    const { min, max, noun, rule } = URL_LISTS[field];
    return `Add ${min > 0 ? `${min} to ${max}` : `at most ${max}`} ${noun}s, each ${rule}.`;
}

export const FORM_LABELS: Record<keyof DappFormFields, string> = {
    name: "Application name",
    description: "Application description",
    logoUrl: "Application logo",
    mauBracket: "Expected monthly active users",
    callbackUrls: "Callback URLs",
    logoutUrls: "Logout URLs",
    webOrigins: "Web origins",
    contactEmail: "Primary contact email",
};

export const FIELD_REASONS: Record<keyof DappFormFields, string> = {
    name: `Enter a name of at most ${NAME_MAX_LENGTH} characters (most emoji count as two or more), with no < or > and no hidden or private-use characters.`,
    description: `Use at most ${DESCRIPTION_MAX_LENGTH} characters (most emoji count as two or more). Tabs and line breaks are fine, but not other control characters or direction embedding, override or isolate characters.`,
    logoUrl: `Enter an https URL on a public host, of at most ${LOGO_URL_MAX_LENGTH} characters.`,
    mauBracket: "Choose how many monthly active users you expect.",
    callbackUrls: listReason("callbackUrls"),
    logoutUrls: listReason("logoutUrls"),
    webOrigins: listReason("webOrigins"),
    contactEmail: "Enter a valid email address.",
};

// The form holds a URL list as rows of `{ value }`, as `useFieldArray` needs; the schema's output is the list the API takes.
function urlList(field: UrlListField) {
    const { isValid, rule } = URL_LISTS[field];
    return z
        .array(z.object({ value: z.string().refine(isValid, `Enter ${rule}.`) }))
        .transform((rows) => rows.map((row) => row.value))
        .refine((values) => isValidUrlList(field, values), FIELD_REASONS[field])
        .transform(normaliseUrlList);
}

export const dappFormSchema = z.object({
    name: z.string().trim().refine(isValidName, FIELD_REASONS.name),
    description: z.string().trim().refine(isValidDescription, FIELD_REASONS.description),
    logoUrl: z.string().refine(isLogoUrl, FIELD_REASONS.logoUrl).transform(normaliseUrl),
    mauBracket: z.enum(MAU_BRACKETS, { error: FIELD_REASONS.mauBracket }),
    callbackUrls: urlList("callbackUrls"),
    logoutUrls: urlList("logoutUrls"),
    webOrigins: urlList("webOrigins"),
    contactEmail: z.string().trim().refine(isContactEmail, FIELD_REASONS.contactEmail),
});

export type DappFormInput = z.input<typeof dappFormSchema>;
