import { HttpStatus } from "@nestjs/common";
import type { ErrorDefinition } from "../../common/exception/error-codes";

export enum AuthErrorCode {
    UNAUTHENTICATED = "UNAUTHENTICATED",
    EMAIL_REQUIRED = "EMAIL_REQUIRED",
    EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
    FORBIDDEN_ROLE = "FORBIDDEN_ROLE",
}

export const AuthErrorBody: Record<AuthErrorCode, ErrorDefinition> = {
    [AuthErrorCode.UNAUTHENTICATED]: { status: HttpStatus.UNAUTHORIZED, message: "A valid ID token is required." },
    [AuthErrorCode.EMAIL_REQUIRED]: { status: HttpStatus.FORBIDDEN, message: "The ID token has no email claim." },
    [AuthErrorCode.EMAIL_NOT_VERIFIED]: { status: HttpStatus.FORBIDDEN, message: "Verify your email address to continue." },
    [AuthErrorCode.FORBIDDEN_ROLE]: { status: HttpStatus.FORBIDDEN, message: "Your role does not allow this action." },
};
