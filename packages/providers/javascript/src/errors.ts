export enum JavascriptProviderErrorCodes {
    USER_NOT_LOGGED_IN = "USER_NOT_LOGGED_IN",
    TESTING_TENANT_NOT_CONFIGURED = "TESTING_TENANT_NOT_CONFIGURED",
    POPUP_BLOCKED = "POPUP_BLOCKED",
    POPUP_CLOSED = "POPUP_CLOSED",
    AUTHORIZATION_FAILED = "AUTHORIZATION_FAILED",
    SIGNATURE_REQUEST_NOT_FOUND = "SIGNATURE_REQUEST_NOT_FOUND",
    SIGNING_USER_MISMATCH = "SIGNING_USER_MISMATCH",
    SIGNING_PAYLOAD_MISMATCH = "SIGNING_PAYLOAD_MISMATCH",
}

export class JavascriptProviderError extends Error {
    constructor(code: JavascriptProviderErrorCodes) {
        super(code.toString());
        this.name = "Auth0ProviderError";
    }
}
