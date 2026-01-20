/**
 * Encodes the function call arguments into a base64 string.
 * @param args The arguments to encode.
 * @returns A base64 encoded string.
 */
export function encodeFunctionCallArgs(args: object): string {
    return Buffer.from(JSON.stringify(args)).toString("base64");
}

/**
 * Parse the result of a view function call.
 * @param result The result of the view function call.
 * @returns The parsed result.
 */
export function parseFunctionCallReturn<T>(result: number[]): T {
    return JSON.parse(Buffer.from(result).toString());
}
