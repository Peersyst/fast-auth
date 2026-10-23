import { HttpStatus } from "@nestjs/common";
import type { ErrorCodeDefinitions } from "../../common/exception/error-codes";

export const DappsErrorCodes = {
    DAPP_NOT_FOUND: { status: HttpStatus.NOT_FOUND, message: "dApp not found." },
    DAPP_ALREADY_EXISTS: { status: HttpStatus.CONFLICT, message: "This email already owns a live dApp." },
    INVALID_TRANSITION: { status: HttpStatus.CONFLICT, message: "The dApp cannot do this in its current state." },
    NO_PENDING_CHANGE: { status: HttpStatus.CONFLICT, message: "The dApp has no pending change." },
    DAPP_CHANGED: { status: HttpStatus.CONFLICT, message: "The dApp changed since it was loaded. Reload and try again." },
    PROVISIONING_REJECTED: {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: "Auth0 refused the request, or the Auth0 client is not this dApp's.",
    },
    PROVISIONING_FAILED: {
        status: HttpStatus.BAD_GATEWAY,
        message:
            "The console could not finish the request in Auth0, though Auth0 may hold part of it. Try again later; if it keeps failing, an admin can see the cause in the dApp's Auth0 error.",
    },
} as const satisfies ErrorCodeDefinitions;
