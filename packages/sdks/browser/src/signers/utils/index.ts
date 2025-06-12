/**
 * Stringify the input as a JSON string and return a buffer.
 * @param input The input to stringify.
 * @returns The stringified input as a buffer.
 */
export function bytesJsonStringify(input: any): Buffer {
    return Buffer.from(JSON.stringify(input));
}
