import { DomainError } from "./domain-error";

/**
 * Checks if an error is a DomainError.
 * @param error The error to check.
 * @returns True if the error is a DomainError, false otherwise.
 */
export function isDomainError(error: any): error is DomainError {
    return error instanceof Error && error.name === "DomainError";
}
