/**
 * Builds an error shaped like the generated client's `ApiError` for a console error body.
 * @param statusCode The HTTP status.
 * @param message The body's error code.
 * @param fields The refused properties a VALIDATION_FAILED body lists.
 * @returns The error.
 */
export function createApiErrorMock(statusCode: number, message: string, fields?: string[]): Error {
    return Object.assign(new Error(message), { status: statusCode, body: { statusCode, message, ...(fields && { fields }) } });
}
