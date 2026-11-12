import { ReactNode } from "react";
import { z } from "zod";
import { DappStatus, DappFieldsDto, UpsertDappRequest } from "@shared/console";
import {
    DESCRIPTION_MAX_LENGTH,
    isLogoUrl,
    isValidDescription,
    isValidName,
    isValidUrlList,
    LOGO_URL_MAX_LENGTH,
    MauBracket,
    NAME_MAX_LENGTH,
    normaliseUrl,
    normaliseUrlList,
    URL_LIST_RULES,
    UrlListField,
} from "@shared/modules/dapp";

export const MAU_BRACKETS: MauBracket[] = Object.values(MauBracket);

/**
 * The error key of each field that breaks its rule.
 */
export const DAPP_FORM_ERRORS = {
    name: "nameInvalid",
    description: "descriptionInvalid",
    logoUrl: "logoUrlInvalid",
    mauBracket: "mauBracketRequired",
    callbackUrls: "callbackUrlsInvalid",
    logoutUrls: "logoutUrlsInvalid",
    webOrigins: "webOriginsInvalid",
    contactEmail: "contactEmailInvalid",
} as const satisfies Record<keyof UpsertDappRequest, string>;

/**
 * The error key of a URL that breaks its list's rule, by list.
 */
const URL_ERRORS = {
    callbackUrls: "urlInvalid",
    logoutUrls: "urlInvalid",
    webOrigins: "webOriginInvalid",
} as const satisfies Record<UrlListField, string>;

/**
 * Builds the schema of a URL list. The form holds it as rows of `{ value }`, as `useFieldArray` needs; the output is the
 * normalised list the API takes. The list's own rule is checked only once every row passes, so a bad row is reported once.
 * @param field The URL list field.
 * @returns The schema.
 */
function urlList(field: UrlListField) {
    const { isValid } = URL_LIST_RULES[field];
    return z
        .array(z.object({ value: z.string().refine(isValid, URL_ERRORS[field]) }))
        .refine(
            (rows) =>
                !rows.every((row) => isValid(row.value)) ||
                isValidUrlList(
                    field,
                    rows.map((row) => row.value),
                ),
            DAPP_FORM_ERRORS[field],
        )
        .transform((rows) => normaliseUrlList(rows.map((row) => row.value)));
}

/**
 * The dApp form's schema, on the console's own field rules. Each message is a key of the `error` namespace.
 */
export const dappFormSchema = z.object({
    name: z.string().trim().refine(isValidName, DAPP_FORM_ERRORS.name),
    description: z.string().trim().refine(isValidDescription, DAPP_FORM_ERRORS.description),
    logoUrl: z.string().refine(isLogoUrl, DAPP_FORM_ERRORS.logoUrl).transform(normaliseUrl),
    mauBracket: z.nativeEnum(MauBracket, { message: DAPP_FORM_ERRORS.mauBracket }),
    callbackUrls: urlList("callbackUrls"),
    logoutUrls: urlList("logoutUrls"),
    webOrigins: urlList("webOrigins"),
    contactEmail: z.string().trim().max(254, DAPP_FORM_ERRORS.contactEmail).email(DAPP_FORM_ERRORS.contactEmail),
});

export type DappFormInput = z.input<typeof dappFormSchema>;

export type DappFormField = keyof DappFormInput;

/**
 * The values each field's error message interpolates.
 */
export const DAPP_FORM_ERROR_VALUES: Partial<Record<DappFormField, { min?: number; max: number }>> = {
    name: { max: NAME_MAX_LENGTH },
    description: { max: DESCRIPTION_MAX_LENGTH },
    logoUrl: { max: LOGO_URL_MAX_LENGTH },
    callbackUrls: URL_LIST_RULES.callbackUrls,
    logoutUrls: URL_LIST_RULES.logoutUrls,
    webOrigins: URL_LIST_RULES.webOrigins,
};

export type EditedDapp = UpsertDappRequest & { status: DappStatus; pendingChange: DappFieldsDto | null };

export type DappFormProps = {
    mode: "owner" | "admin";
    values: EditedDapp | null;
    saveLabel: string;
    saveHint?: ReactNode;
    onSave: (fields: UpsertDappRequest) => Promise<unknown>;
    onCancel: () => void;
    onReload?: () => void;
    onRemove?: () => void;
};
