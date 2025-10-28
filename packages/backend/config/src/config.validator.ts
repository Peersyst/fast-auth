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
