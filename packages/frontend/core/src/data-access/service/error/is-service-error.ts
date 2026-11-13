import { ServiceError } from "./service-error";

/**
 * Checks if an error is a service error.
 * @param error The error to check.
 * @returns True if the error is a service error, false otherwise.
 */
export function isServiceError(error: any): error is ServiceError {
    return error instanceof Error && error.name === "ServiceError";
}
