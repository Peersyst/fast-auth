import { Transform } from "class-transformer";
import { registerDecorator } from "class-validator";
import {
    isContactEmail,
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
 * Registers a validator that accepts only a string that passes the rule.
 * @param name The constraint name reported on failure.
 * @param message The validation message, where $property stands for the field.
 * @param rule The check.
 * @returns The property decorator.
 */
function stringRule(name: string, message: string, rule: (value: string) => boolean): PropertyDecorator {
    return (target, propertyName) =>
        registerDecorator({
            name,
            target: target.constructor,
            propertyName: String(propertyName),
            options: { message },
            validator: { validate: (value: unknown) => typeof value === "string" && rule(value) },
        });
}

/**
 * Accepts only a list of strings within the count and URL rules of the named field.
 * @param field The URL list field whose rules apply.
 * @returns The property decorator.
 */
export const IsUrlList =
    (field: UrlListField): PropertyDecorator =>
    (target, propertyName) =>
        registerDecorator({
            name: "isUrlList",
            target: target.constructor,
            propertyName: String(propertyName),
            options: { message: "$property must be a list of public https URLs within the allowed count" },
            validator: {
                validate: (value: unknown) =>
                    Array.isArray(value) && value.every((element) => typeof element === "string") && isValidUrlList(field, value),
            },
        });

/**
 * Accepts only a string that passes the logo URL rule.
 * @returns The property decorator.
 */
export const IsLogoUrl = (): PropertyDecorator =>
    stringRule("isLogoUrl", "$property must be a public https URL of at most 255 characters", isLogoUrl);

/**
 * Accepts only a string that passes the dApp name rule.
 * @returns The property decorator.
 */
export const IsDappName = (): PropertyDecorator => stringRule("isDappName", "$property must be a valid dApp name", isValidName);

/**
 * Accepts only a string that passes the dApp description rule.
 * @returns The property decorator.
 */
export const IsDappDescription = (): PropertyDecorator =>
    stringRule("isDappDescription", "$property must be a valid dApp description", isValidDescription);

/**
 * Accepts only a string that passes the contact email rule.
 * @returns The property decorator.
 */
export const IsContactEmail = (): PropertyDecorator => stringRule("isContactEmail", "$property must be an email address", isContactEmail);

/**
 * Accepts only a string without a NUL character, which Postgres text cannot store.
 * @returns The property decorator.
 */
export const HasNoNul = (): PropertyDecorator =>
    stringRule("hasNoNul", "$property must not contain a NUL character", (value) => !value.includes(NUL));

/**
 * Accepts only a string whose length is within the bounds, counted in UTF-16 code units.
 * @param min The shortest length allowed.
 * @param max The longest length allowed.
 * @returns The property decorator.
 */
export const HasLength = (min: number, max: number): PropertyDecorator =>
    stringRule(
        "hasLength",
        `$property must be ${min} to ${max} UTF-16 code units long`,
        (value) => value.length >= min && value.length <= max,
    );
