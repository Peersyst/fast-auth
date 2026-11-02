import { Transform } from "class-transformer";
import { registerDecorator } from "class-validator";
import type { UrlListField } from "@shared/console-domain/field-rules";
import {
    isContactEmail,
    isLogoUrl,
    isValidDescription,
    isValidName,
    isValidUrlList,
    normaliseUrl,
    normaliseUrlList,
} from "@shared/console-domain/field-rules";

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
 * @param rule The check.
 * @returns The property decorator.
 */
function stringRule(name: string, rule: (value: string) => boolean): PropertyDecorator {
    return (target, propertyName) =>
        registerDecorator({
            name,
            target: target.constructor,
            propertyName: String(propertyName),
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
            validator: {
                validate: (value: unknown) =>
                    Array.isArray(value) && value.every((element) => typeof element === "string") && isValidUrlList(field, value),
            },
        });

/**
 * Accepts only a string that passes the logo URL rule.
 * @returns The property decorator.
 */
export const IsLogoUrl = (): PropertyDecorator => stringRule("isLogoUrl", isLogoUrl);

/**
 * Accepts only a string that passes the dApp name rule.
 * @returns The property decorator.
 */
export const IsDappName = (): PropertyDecorator => stringRule("isDappName", isValidName);

/**
 * Accepts only a string that passes the dApp description rule.
 * @returns The property decorator.
 */
export const IsDappDescription = (): PropertyDecorator => stringRule("isDappDescription", isValidDescription);

/**
 * Accepts only a string that passes the contact email rule.
 * @returns The property decorator.
 */
export const IsContactEmail = (): PropertyDecorator => stringRule("isContactEmail", isContactEmail);
