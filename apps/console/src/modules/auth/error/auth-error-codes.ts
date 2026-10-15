import { HttpStatus } from "@nestjs/common";
import type { ErrorCodeDefinitions } from "../../common/exception/error-codes";

export const AuthErrorCodes = {
    UNAUTHENTICATED: { status: HttpStatus.UNAUTHORIZED, message: "A valid ID token is required." },
    EMAIL_REQUIRED: { status: HttpStatus.FORBIDDEN, message: "The ID token has no email claim." },
    EMAIL_NOT_VERIFIED: { status: HttpStatus.FORBIDDEN, message: "Verify your email address to continue." },
    FORBIDDEN_ROLE: { status: HttpStatus.FORBIDDEN, message: "Your role does not allow this action." },
} as const satisfies ErrorCodeDefinitions;
