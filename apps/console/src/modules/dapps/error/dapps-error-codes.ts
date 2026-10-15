import { HttpStatus } from "@nestjs/common";
import type { ErrorDefinition } from "../../common/exception/error-codes";

export enum DappsErrorCode {
    DAPP_NOT_FOUND = "DAPP_NOT_FOUND",
    DAPP_ALREADY_EXISTS = "DAPP_ALREADY_EXISTS",
    INVALID_TRANSITION = "INVALID_TRANSITION",
    NO_PENDING_CHANGE = "NO_PENDING_CHANGE",
    DAPP_CHANGED = "DAPP_CHANGED",
    PROVISIONING_REJECTED = "PROVISIONING_REJECTED",
    PROVISIONING_FAILED = "PROVISIONING_FAILED",
}

export const DappsErrorBody: Record<DappsErrorCode, ErrorDefinition> = {
    [DappsErrorCode.DAPP_NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: "dApp not found." },
    [DappsErrorCode.DAPP_ALREADY_EXISTS]: { status: HttpStatus.CONFLICT, message: "This email already owns a live dApp." },
    [DappsErrorCode.INVALID_TRANSITION]: { status: HttpStatus.CONFLICT, message: "The dApp cannot do this in its current state." },
    [DappsErrorCode.NO_PENDING_CHANGE]: { status: HttpStatus.CONFLICT, message: "The dApp has no pending change." },
    [DappsErrorCode.DAPP_CHANGED]: { status: HttpStatus.CONFLICT, message: "The dApp changed since it was loaded. Reload and try again." },
    [DappsErrorCode.PROVISIONING_REJECTED]: {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: "Auth0 refused the request, or the Auth0 client is not this dApp's.",
    },
    [DappsErrorCode.PROVISIONING_FAILED]: {
        status: HttpStatus.BAD_GATEWAY,
        message:
            "The console could not finish the request in Auth0, though Auth0 may hold part of it. Try again later; if it keeps failing, an admin can see the cause in the dApp's Auth0 error.",
    },
};
