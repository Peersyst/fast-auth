export enum FirebaseProviderErrorCodes {
    USER_NOT_LOGGED_IN = "USER_NOT_LOGGED_IN",
    FIREBASE_NOT_INITIALIZED = "FIREBASE_NOT_INITIALIZED",
    INVALID_PROVIDER = "INVALID_PROVIDER",
}

export class FirebaseProviderError extends Error {
    constructor(code: FirebaseProviderErrorCodes) {
        super(code.toString());
        this.name = "FirebaseProviderError";
    }
}
