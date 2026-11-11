import { Transform } from "class-transformer";
import { ValidateBy } from "class-validator";
import {
    isLogoUrl,
    isValidDescription,
    isValidName,
    isValidUrlList,
    NUL,
    normaliseUrl,
    normaliseUrlList,
    UrlListField,
} from "@shared/modules/dapp";

/**
 * Trims a string before validation and leaves any other value for the validator to refuse.
 * @returns The property decorator.
 */
export const Trim = (): PropertyDecorator =>
    Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value));

/**
 * Normalises a string URL before validation and leaves any other value for the validator to refuse.
 * @returns The property decorator.
 */
export const NormaliseUrl = (): PropertyDecorator =>
    Transform(({ value }: { value: unknown }) => (typeof value === "string" ? normaliseUrl(value) : value));

/**
 * Normalises and de-duplicates a list of string URLs before validation and leaves any other value for the validator to refuse.
 * @returns The property decorator.
 */
export const NormaliseUrlList = (): PropertyDecorator =>
    Transform(({ value }: { value: unknown }) =>
        Array.isArray(value) && value.every((element) => typeof element === "string") ? normaliseUrlList(value) : value,
    );

/**
 * Accepts only a list of strings within the count and URL rules of the named field.
 * @param field The URL list field whose rules apply.
 * @returns The property decorator.
 */
export const IsUrlList = (field: UrlListField): PropertyDecorator =>
    ValidateBy(
        {
            name: "isUrlList",
            validator: {
                validate: (value: unknown) =>
                    Array.isArray(value) && value.every((element) => typeof element === "string") && isValidUrlList(field, value),
            },
        },
        { message: "$property must be a list of public https URLs within the allowed count" },
    );

/**
 * Accepts only a string that passes the logo URL rule.
 * @returns The property decorator.
 */
export const IsLogoUrl = (): PropertyDecorator =>
    ValidateBy(
        { name: "isLogoUrl", validator: { validate: (value: unknown) => typeof value === "string" && isLogoUrl(value) } },
        { message: "$property must be a public https URL of at most 255 characters" },
    );

/**
 * Accepts only a string that passes the dApp name rule.
 * @returns The property decorator.
 */
export const IsDappName = (): PropertyDecorator =>
    ValidateBy(
        { name: "isDappName", validator: { validate: (value: unknown) => typeof value === "string" && isValidName(value) } },
        { message: "$property must be a valid dApp name" },
    );

/**
 * Accepts only a string that passes the dApp description rule.
 * @returns The property decorator.
 */
export const IsDappDescription = (): PropertyDecorator =>
    ValidateBy(
        { name: "isDappDescription", validator: { validate: (value: unknown) => typeof value === "string" && isValidDescription(value) } },
        { message: "$property must be a valid dApp description" },
    );

/**
 * Accepts only a string without a NUL character, which Postgres text cannot store.
 * @returns The property decorator.
 */
export const HasNoNul = (): PropertyDecorator =>
    ValidateBy(
        { name: "hasNoNul", validator: { validate: (value: unknown) => typeof value === "string" && !value.includes(NUL) } },
        { message: "$property must not contain a NUL character" },
    );
