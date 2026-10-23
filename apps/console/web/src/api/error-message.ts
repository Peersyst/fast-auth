import { GenericError } from "@auth0/auth0-react";
import { ApiError, type ErrorCode } from "./client";

const MESSAGES: Record<ErrorCode, string> = {
    VALIDATION_FAILED: "Some values were not accepted. Check the form and try again.",
    NOT_FOUND: "That page or record does not exist.",
    RATE_LIMITED: "Too many changes in a short time. Wait a minute and try again.",
    INTERNAL: "Something went wrong on our side. Try again in a moment.",
    UNAVAILABLE: "The console is starting up or briefly unavailable. Try again in a moment.",
    UNAUTHENTICATED: "Your session has expired. Sign out and sign in again.",
    EMAIL_REQUIRED: "Your account has no email address.",
    EMAIL_NOT_VERIFIED: "Verify your email address first.",
    FORBIDDEN_ROLE: "You don't have access to this page.",
    DAPP_NOT_FOUND: "This dApp no longer exists. Reload to see the current state.",
    DAPP_ALREADY_EXISTS: "This email already has a dApp; each email can have one dApp at a time. Reload to see it.",
    INVALID_TRANSITION: "That action is not possible in the dApp's current state. Reload to see it.",
    NO_PENDING_CHANGE: "There is no change waiting for review any more. Reload to see the current state.",
    DAPP_CHANGED: "This dApp changed since you opened it. Reload to see the latest version, then try again.",
    PROVISIONING_REJECTED:
        "Auth0 refused this change, so the console saved nothing. Trying again will not help until the cause is fixed. Contact the NEAR Auth team.",
    PROVISIONING_FAILED:
        "The console could not finish this in Auth0, so it saved nothing. Try again in a few minutes, and contact the NEAR Auth team if it keeps failing.",
};

export function errorMessage(error: unknown): string {
    if (error instanceof ApiError) return MESSAGES[error.code];
    if (error instanceof TypeError) return "The console could not be reached. Check your connection and try again.";
    if (error instanceof GenericError) return "NEAR Auth could not renew your session. Try again in a minute.";
    return "Something went wrong. Reload the page and try again.";
}
