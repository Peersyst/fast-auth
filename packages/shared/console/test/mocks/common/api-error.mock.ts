/**
 * Builds an error shaped like the generated client's `ApiError` for a console error body.
 * @param statusCode The HTTP status.
 * @param message The body's message: the error code for a business error, the refused properties' messages for a validation error.
 * @returns The error.
 */
export function createApiErrorMock(statusCode: number, message: string | string[]): Error {
    return Object.assign(new Error(String(message)), { status: statusCode, body: { statusCode, message } });
}
