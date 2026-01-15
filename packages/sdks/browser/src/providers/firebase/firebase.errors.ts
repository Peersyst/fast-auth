import { FirebaseProviderErrorCodes } from "./firebase.error-codes";

export class FirebaseProviderError extends Error {
    constructor(code: FirebaseProviderErrorCodes) {
        super(code.toString());
        this.name = "FirebaseProviderError";
    }
}
