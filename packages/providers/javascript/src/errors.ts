export enum JavascriptProviderErrorCodes {
    USER_NOT_LOGGED_IN = "USER_NOT_LOGGED_IN",
}

export class JavascriptProviderError extends Error {
    constructor(code: JavascriptProviderErrorCodes) {
        super(code.toString());
        this.name = "Auth0ProviderError";
    }
}
