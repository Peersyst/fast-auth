export enum ConsoleDappErrors {
    VALIDATION_FAILED = "validationFailed",
    DAPP_NOT_FOUND = "dappNotFound",
    DAPP_ALREADY_EXISTS = "dappAlreadyExists",
    INVALID_TRANSITION = "invalidTransition",
    NO_PENDING_CHANGE = "noPendingChange",
    DAPP_CHANGED = "dappChanged",
    PROVISIONING_REJECTED = "provisioningRejected",
    PROVISIONING_FAILED = "provisioningFailed",
    RATE_LIMITED = "rateLimited",
    SESSION_EXPIRED = "sessionExpired",
    EMAIL_REQUIRED = "emailRequired",
    EMAIL_NOT_VERIFIED = "emailNotVerified",
    FORBIDDEN_ROLE = "forbiddenRole",
    SERVER_ERROR = "serverError",
    CONSOLE_UNREACHABLE = "consoleUnreachable",
}

/**
 * The domain error of each code the console's dApp endpoints answer with, then of the statuses that come without one.
 */
export const CONSOLE_DAPP_API_ERRORS: Record<string, ConsoleDappErrors> = {
    DAPP_NOT_FOUND: ConsoleDappErrors.DAPP_NOT_FOUND,
    DAPP_ALREADY_EXISTS: ConsoleDappErrors.DAPP_ALREADY_EXISTS,
    INVALID_TRANSITION: ConsoleDappErrors.INVALID_TRANSITION,
    NO_PENDING_CHANGE: ConsoleDappErrors.NO_PENDING_CHANGE,
    DAPP_CHANGED: ConsoleDappErrors.DAPP_CHANGED,
    PROVISIONING_REJECTED: ConsoleDappErrors.PROVISIONING_REJECTED,
    PROVISIONING_FAILED: ConsoleDappErrors.PROVISIONING_FAILED,
    RATE_LIMITED: ConsoleDappErrors.RATE_LIMITED,
    UNAUTHENTICATED: ConsoleDappErrors.SESSION_EXPIRED,
    EMAIL_REQUIRED: ConsoleDappErrors.EMAIL_REQUIRED,
    EMAIL_NOT_VERIFIED: ConsoleDappErrors.EMAIL_NOT_VERIFIED,
    FORBIDDEN_ROLE: ConsoleDappErrors.FORBIDDEN_ROLE,
    INTERNAL: ConsoleDappErrors.SERVER_ERROR,
    VALIDATION_FAILED: ConsoleDappErrors.VALIDATION_FAILED,
    // The console only gets these when it and the API disagree on a route or a body, which the user cannot fix.
    NOT_FOUND: ConsoleDappErrors.SERVER_ERROR,
    METHOD_NOT_ALLOWED: ConsoleDappErrors.SERVER_ERROR,
    PAYLOAD_TOO_LARGE: ConsoleDappErrors.SERVER_ERROR,
    UNSUPPORTED_MEDIA_TYPE: ConsoleDappErrors.SERVER_ERROR,
    401: ConsoleDappErrors.SESSION_EXPIRED,
    500: ConsoleDappErrors.SERVER_ERROR,
};
