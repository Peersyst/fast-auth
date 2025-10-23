/**
 * Checks if the provided error is a rate limit error.
 * @param error The error to check.
 * @returns A boolean indicating if the error is a rate limit error.
 */
export function isRateLimitError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const stringError = error.toString().toLowerCase();
    let stringifiedError: string | undefined;
    try {
        stringifiedError = JSON.stringify(error);
    } catch {
        stringifiedError = undefined;
    }

    return (
        ("code" in error && error.code === 429) ||
        ["429", "exceeded the quota usage", "rate limit"].some((str) => stringError.includes(str)) ||
        (stringifiedError !== undefined && stringifiedError.includes("Forbidden"))
    );
}
