/**
 * Builds an error shaped like the generated client's `ApiError` for a console error body.
 * @param statusCode The HTTP status.
 * @param message The body's error code, or the refusals of a request Nest's ValidationPipe rejected.
 * @returns The error.
 */
export function createApiErrorMock(statusCode: number, message: string | string[]): Error {
    return Object.assign(new Error(String(message)), { status: statusCode, body: { statusCode, message } });
}
