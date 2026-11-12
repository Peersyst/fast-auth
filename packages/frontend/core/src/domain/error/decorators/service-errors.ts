import { isServiceError } from "../../../data-access/service/error";
import { createErrorHandlerDecorator } from "@shared/utils";
import { DomainError, DomainErrorOptions } from "../domain-error";

/**
 * Handle service errors.
 * @param error The error to handle.
 * @param errors A map of error messages to domain errors `{ USER_NOT_FOUND: UserErrors.USER_NOT_FOUND }`
 */
function handleServiceError(error: any, errors: Record<string, string | DomainErrorOptions>): void {
    if (isServiceError(error)) {
        const domainError = errors[error.message];
        throw typeof domainError === "string"
            ? new DomainError(domainError)
            : DomainError.fromOptions({ ...domainError, data: { ...error.data, ...domainError.data } });
    } else throw error;
}

/**
 * Decorator to handle service errors
 * @param errors A map of error messages to domain errors `{ USER_NOT_FOUND: UserErrors.USER_NOT_FOUND }`
 */
export const ServiceErrors = createErrorHandlerDecorator(handleServiceError);
