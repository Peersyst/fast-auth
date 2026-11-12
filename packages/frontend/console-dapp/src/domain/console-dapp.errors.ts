export enum ConsoleDappErrors {
    VALIDATION_FAILED = "validationFailed",
    DAPP_NOT_FOUND = "dappNotFound",
    DAPP_ALREADY_EXISTS = "dappAlreadyExists",
    INVALID_TRANSITION = "invalidTransition",
    DAPP_CHANGED = "dappChanged",
    PROVISIONING_REJECTED = "provisioningRejected",
    PROVISIONING_FAILED = "provisioningFailed",
    SESSION_EXPIRED = "sessionExpired",
    EMAIL_REQUIRED = "emailRequired",
    EMAIL_NOT_VERIFIED = "emailNotVerified",
    FORBIDDEN_ROLE = "forbiddenRole",
    SERVER_ERROR = "serverError",
    CONSOLE_UNREACHABLE = "consoleUnreachable",
}

/**
 * The domain error of each code the console's dApp endpoints answer with, then of the statuses that come without one: a 400 is a value the console's validation refused.
 */
export const CONSOLE_DAPP_API_ERRORS: Record<string, ConsoleDappErrors> = {
    DAPP_NOT_FOUND: ConsoleDappErrors.DAPP_NOT_FOUND,
    DAPP_ALREADY_EXISTS: ConsoleDappErrors.DAPP_ALREADY_EXISTS,
    INVALID_TRANSITION: ConsoleDappErrors.INVALID_TRANSITION,
    DAPP_CHANGED: ConsoleDappErrors.DAPP_CHANGED,
    PROVISIONING_REJECTED: ConsoleDappErrors.PROVISIONING_REJECTED,
    PROVISIONING_FAILED: ConsoleDappErrors.PROVISIONING_FAILED,
    UNAUTHENTICATED: ConsoleDappErrors.SESSION_EXPIRED,
    EMAIL_REQUIRED: ConsoleDappErrors.EMAIL_REQUIRED,
    EMAIL_NOT_VERIFIED: ConsoleDappErrors.EMAIL_NOT_VERIFIED,
    FORBIDDEN_ROLE: ConsoleDappErrors.FORBIDDEN_ROLE,
    400: ConsoleDappErrors.VALIDATION_FAILED,
    401: ConsoleDappErrors.SESSION_EXPIRED,
    // The console only gets these when it and the API disagree on a route or a body, which the user cannot fix.
    404: ConsoleDappErrors.SERVER_ERROR,
    405: ConsoleDappErrors.SERVER_ERROR,
    413: ConsoleDappErrors.SERVER_ERROR,
    415: ConsoleDappErrors.SERVER_ERROR,
    500: ConsoleDappErrors.SERVER_ERROR,
};
