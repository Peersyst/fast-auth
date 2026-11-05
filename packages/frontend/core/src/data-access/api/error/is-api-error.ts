import { ApiError } from "./api-error";

/**
 * Checks if an error is an API error.
 * @param error The error to check.
 * @returns True if the error is an API error, false otherwise.
 */
export function isApiError(error: any): error is ApiError {
    return (
        error instanceof Error &&
        !!(error as any).body &&
        typeof (error as any).body.statusCode === "number" &&
        typeof (error as any).body.message === "string"
    );
}
