import { HttpStatus } from "@nestjs/common";
import type { ErrorDefinition } from "./error-codes";

export enum CommonErrorCode {
    VALIDATION_FAILED = "VALIDATION_FAILED",
    NOT_FOUND = "NOT_FOUND",
    RATE_LIMITED = "RATE_LIMITED",
    INTERNAL = "INTERNAL",
    UNAVAILABLE = "UNAVAILABLE",
}

export const CommonErrorBody: Record<CommonErrorCode, ErrorDefinition> = {
    [CommonErrorCode.VALIDATION_FAILED]: { status: HttpStatus.BAD_REQUEST, message: "The request is invalid." },
    [CommonErrorCode.NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: "Not found." },
    [CommonErrorCode.RATE_LIMITED]: { status: HttpStatus.TOO_MANY_REQUESTS, message: "Too many requests. Try again later." },
    [CommonErrorCode.INTERNAL]: { status: HttpStatus.INTERNAL_SERVER_ERROR, message: "Internal error." },
    [CommonErrorCode.UNAVAILABLE]: { status: HttpStatus.SERVICE_UNAVAILABLE, message: "Not ready. Try again later." },
};
