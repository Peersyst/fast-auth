import { Auth0ProviderErrorCodes } from "./auth0.error-codes";

export class Auth0ProviderError extends Error {
    constructor(code: Auth0ProviderErrorCodes) {
        super(code.toString());
        this.name = "Auth0ProviderError";
    }
}
