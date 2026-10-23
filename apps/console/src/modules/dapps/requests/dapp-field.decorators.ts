import { Transform } from "class-transformer";
import { registerDecorator } from "class-validator";
import type { UrlListField } from "../../../domain/field-rules";
import {
    isContactEmail,
    isLogoUrl,
    isValidDescription,
    isValidName,
    isValidUrlList,
    normaliseUrl,
    normaliseUrlList,
} from "../../../domain/field-rules";

export const Trim = (): PropertyDecorator =>
    Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value));

export const NormaliseUrl = (): PropertyDecorator =>
    Transform(({ value }: { value: unknown }) => (typeof value === "string" ? normaliseUrl(value) : value));

export const NormaliseUrlList = (): PropertyDecorator =>
    Transform(({ value }: { value: unknown }) =>
        Array.isArray(value) && value.every((element) => typeof element === "string") ? normaliseUrlList(value) : value,
    );

function stringRule(name: string, rule: (value: string) => boolean): PropertyDecorator {
    return (target, propertyName) =>
        registerDecorator({
            name,
            target: target.constructor,
            propertyName: String(propertyName),
            validator: { validate: (value: unknown) => typeof value === "string" && rule(value) },
        });
}

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

export const IsLogoUrl = (): PropertyDecorator => stringRule("isLogoUrl", isLogoUrl);

export const IsDappName = (): PropertyDecorator => stringRule("isDappName", isValidName);

export const IsDappDescription = (): PropertyDecorator => stringRule("isDappDescription", isValidDescription);

export const IsContactEmail = (): PropertyDecorator => stringRule("isContactEmail", isContactEmail);
