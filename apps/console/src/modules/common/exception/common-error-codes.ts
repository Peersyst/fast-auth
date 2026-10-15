import { HttpStatus } from "@nestjs/common";
import type { ErrorCodeDefinitions } from "./error-codes";

export const CommonErrorCodes = {
    VALIDATION_FAILED: { status: HttpStatus.BAD_REQUEST, message: "The request is invalid." },
    NOT_FOUND: { status: HttpStatus.NOT_FOUND, message: "Not found." },
    RATE_LIMITED: { status: HttpStatus.TOO_MANY_REQUESTS, message: "Too many requests. Try again later." },
    INTERNAL: { status: HttpStatus.INTERNAL_SERVER_ERROR, message: "Internal error." },
} as const satisfies ErrorCodeDefinitions;
