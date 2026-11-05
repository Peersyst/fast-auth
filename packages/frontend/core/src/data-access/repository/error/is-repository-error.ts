import { RepositoryError } from "./repository-error";

/**
 * Checks if an error is a repository error.
 * @param error The error to check.
 * @returns True if the error is a repository error, false otherwise.
 */
export function isRepositoryError(error: any): error is RepositoryError {
    return error instanceof Error && error.name === "RepositoryError";
}
