import { HttpStatus } from "@nestjs/common";

export enum AuthErrorCode {
    UNAUTHENTICATED = "UNAUTHENTICATED",
    EMAIL_REQUIRED = "EMAIL_REQUIRED",
    EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
    FORBIDDEN_ROLE = "FORBIDDEN_ROLE",
}

export const AuthErrorBody: Record<AuthErrorCode, { statusCode: HttpStatus; message: string }> = {
    [AuthErrorCode.UNAUTHENTICATED]: {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: AuthErrorCode.UNAUTHENTICATED,
    },
    [AuthErrorCode.EMAIL_REQUIRED]: {
        statusCode: HttpStatus.FORBIDDEN,
        message: AuthErrorCode.EMAIL_REQUIRED,
    },
    [AuthErrorCode.EMAIL_NOT_VERIFIED]: {
        statusCode: HttpStatus.FORBIDDEN,
        message: AuthErrorCode.EMAIL_NOT_VERIFIED,
    },
    [AuthErrorCode.FORBIDDEN_ROLE]: {
        statusCode: HttpStatus.FORBIDDEN,
        message: AuthErrorCode.FORBIDDEN_ROLE,
    },
};
