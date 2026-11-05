import { isEmail } from "class-validator";

const HOST_NAME = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/**
 * Validates a port.
 * @param port The port to validate.
 * @returns True if the port is valid, false otherwise.
 */
export const validPort = (port: number): boolean => !isNaN(port) && port > 0 && port < 65535;

/**
 * Validates a base64 key.
 * @param key The key to validate.
 * @returns True if the key is valid, false otherwise.
 */
export const validB64Key = (key: string): boolean => {
    try {
        return Buffer.from(key, "base64").length === 32;
    } catch (_e) {
        return false;
    }
};

/**
 * Validates a positive integer, such as a timeout or a count.
 * @param value The value to validate.
 * @returns True if the value is a positive integer.
 */
export const validPositiveInt = (value: number): boolean => Number.isInteger(value) && value > 0;

/**
 * Validates a set string.
 * @param value The value to validate.
 * @returns True if the value is a non-empty string.
 */
export const validRequired = (value: string | undefined): boolean => typeof value === "string" && value !== "";

/**
 * Validates a host name such as login.example.com, without scheme, port or path.
 * @param value The value to validate.
 * @returns True if the value is a host name.
 */
export const validHostName = (value: string | undefined): boolean => typeof value === "string" && HOST_NAME.test(value);

/**
 * Validates an email address.
 * @param value The value to validate.
 * @returns True if the value is an email address.
 */
export const validEmail = (value: string | undefined): boolean => typeof value === "string" && isEmail(value);

/**
 * Builds a validator that accepts only the given values.
 * @param values The allowed values.
 * @returns The validator.
 */
export const validOneOf =
    <T>(values: readonly T[]) =>
    (value: T): boolean =>
        values.includes(value);

/**
 * Validates an http or https origin with no path, query, fragment or credentials.
 * @param value The value to validate, without trailing slashes.
 * @returns True if the value is such an origin.
 */
export const validPublicUrl = (value: string | undefined): boolean => {
    if (!value || /[?#@]/.test(value) || !URL.canParse(value)) return false;
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && url.pathname === "/";
};

/**
 * Validates an https URL.
 * @param value The value to validate.
 * @returns True if the value is an https URL.
 */
export const validHttpsUrl = (value: string | undefined): boolean =>
    typeof value === "string" && URL.canParse(value) && new URL(value).protocol === "https:";
