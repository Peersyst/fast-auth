import { isDomainError } from "@frontend/core/domain/error";
import { useTranslate } from "@frontend/locale/react";
import { LocaleErrorResource } from "@frontend/locale";

/**
 * Translates an error for the user: a domain error by its code, anything else as a generic failure.
 * @param error The error.
 * @returns The message.
 */
export function useErrorMessage(error: unknown): string {
    const translateError = useTranslate("error");
    const code = isDomainError(error) ? (error.message as LocaleErrorResource) : "somethingWentWrong";
    return translateError([code, "somethingWentWrong"]);
}
