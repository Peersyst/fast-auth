import { createErrorHandlerDecorator } from "@shared/utils";
import { DomainError, DomainErrorOptions } from "../domain-error";

/**
 * Handle default errors.
 * @param error The error to handle.
 * @param domainError The domain error to throw.
 */
function handleDefaultError(error: any, domainError: string | DomainErrorOptions): void {
    if (!(error instanceof DomainError))
        throw typeof domainError === "string" ? new DomainError(domainError) : DomainError.fromOptions(domainError);
    else throw error;
}

/**
 * Decorator to throw a default error when an unhandled error is thrown
 * @param errorCode The domain error code to throw
 */
export const DefaultError = createErrorHandlerDecorator(handleDefaultError);
