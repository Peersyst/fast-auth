export enum ConsoleAdminErrors {
    DAPP_NOT_FOUND = "dappNotFound",
    INVALID_TRANSITION = "invalidTransition",
    NO_PENDING_CHANGE = "noPendingChange",
    SESSION_EXPIRED = "sessionExpired",
    EMAIL_REQUIRED = "emailRequired",
    EMAIL_NOT_VERIFIED = "emailNotVerified",
    FORBIDDEN_ROLE = "forbiddenRole",
    SERVER_ERROR = "serverError",
    CONSOLE_UNREACHABLE = "consoleUnreachable",
}

/**
 * The domain error of each code the console's admin endpoints answer with, then of the statuses that come without one.
 */
export const CONSOLE_ADMIN_API_ERRORS: Record<string, ConsoleAdminErrors> = {
    DAPP_NOT_FOUND: ConsoleAdminErrors.DAPP_NOT_FOUND,
    INVALID_TRANSITION: ConsoleAdminErrors.INVALID_TRANSITION,
    DAPP_CHANGE_NOT_FOUND: ConsoleAdminErrors.NO_PENDING_CHANGE,
    UNAUTHENTICATED: ConsoleAdminErrors.SESSION_EXPIRED,
    EMAIL_REQUIRED: ConsoleAdminErrors.EMAIL_REQUIRED,
    EMAIL_NOT_VERIFIED: ConsoleAdminErrors.EMAIL_NOT_VERIFIED,
    FORBIDDEN_ROLE: ConsoleAdminErrors.FORBIDDEN_ROLE,
    401: ConsoleAdminErrors.SESSION_EXPIRED,
    // The console only gets these when it and the API disagree on a route or a body, which the user cannot fix.
    400: ConsoleAdminErrors.SERVER_ERROR,
    404: ConsoleAdminErrors.SERVER_ERROR,
    405: ConsoleAdminErrors.SERVER_ERROR,
    413: ConsoleAdminErrors.SERVER_ERROR,
    415: ConsoleAdminErrors.SERVER_ERROR,
    500: ConsoleAdminErrors.SERVER_ERROR,
};

/**
 * A dApp the admin opened by an id that names no dApp, or is not one.
 */
export const CONSOLE_ADMIN_GET_DAPP_ERRORS: Record<string, ConsoleAdminErrors> = {
    ...CONSOLE_ADMIN_API_ERRORS,
    400: ConsoleAdminErrors.DAPP_NOT_FOUND,
    404: ConsoleAdminErrors.DAPP_NOT_FOUND,
};
