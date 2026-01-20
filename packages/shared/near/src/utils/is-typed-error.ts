import { TypedError } from "near-api-js/lib/providers";

/**
 * Checks if the error is a TypedError.
 * @param e The error to check.
 * @returns True if the error is a TypedError, false otherwise.
 */
export function isTypedError(e: unknown): e is TypedError {
    return e instanceof TypedError;
}
