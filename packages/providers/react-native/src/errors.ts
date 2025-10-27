/**
 * Error codes for ReactNativeProvider
 */
export enum ReactNativeProviderErrorCodes {
    USER_NOT_LOGGED_IN = "USER_NOT_LOGGED_IN",
    CREDENTIALS_NOT_FOUND = "CREDENTIALS_NOT_FOUND",
    INVALID_TOKEN = "INVALID_TOKEN",
}

/**
 * Error class for ReactNativeProvider
 */
export class ReactNativeProviderError extends Error {
    constructor(code: ReactNativeProviderErrorCodes) {
        super(code.toString());
        this.name = "ReactNativeProviderError";
    }
}
