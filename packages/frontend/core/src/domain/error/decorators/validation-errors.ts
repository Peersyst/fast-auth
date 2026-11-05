import { createErrorHandlerDecorator } from "@shared/utils";
import { DomainError } from "../domain-error";

/**
 * Reads the properties a validation answer refused, which the console lists in `fields` beside the VALIDATION_FAILED code.
 * @param error Any error.
 * @returns The refused properties, empty when the answer names none, or `undefined` when the error is not a validation answer.
 */
function refusedProperties(error: any): string[] | undefined {
    const body = error instanceof Error ? (error as any).body : undefined;
    if (body?.message !== "VALIDATION_FAILED") return undefined;
    return Array.isArray(body.fields) ? body.fields.filter((field: unknown) => typeof field === "string") : [];
}

/**
 * Handle validation errors.
 * @param error The error to handle.
 * @param domainError The domain error to throw, with the refused properties as `data.fields`.
 */
function handleValidationError(error: any, domainError: string): void {
    const fields = refusedProperties(error);
    if (fields) throw new DomainError(domainError, "error", { fields });
    throw error;
}

/**
 * Decorator to handle a VALIDATION_FAILED answer, passing on the refused properties it lists.
 * Place it below `@ApiErrors`, nearer the method, so it reads the answer before `@ApiErrors` maps its code.
 * @param domainError The domain error code to throw.
 */
export const ValidationErrors = createErrorHandlerDecorator(handleValidationError);
