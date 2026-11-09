import { HttpStatus } from "@nestjs/common";
import { AuthErrorBody, AuthErrorCode } from "../../auth/error/auth.error-codes";
import { DappErrorBody, DappErrorCode } from "../../dapp/error/dapp.error-codes";

// Define app error codes
enum AppErrorCode {
    VALIDATION_FAILED = "VALIDATION_FAILED",
    NOT_FOUND = "NOT_FOUND",
    METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED",
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE",
    UNSUPPORTED_MEDIA_TYPE = "UNSUPPORTED_MEDIA_TYPE",
    INTERNAL = "INTERNAL",
}

const AppErrorBody: Record<AppErrorCode, { statusCode: HttpStatus; message: string }> = {
    [AppErrorCode.VALIDATION_FAILED]: { statusCode: HttpStatus.BAD_REQUEST, message: AppErrorCode.VALIDATION_FAILED },
    [AppErrorCode.NOT_FOUND]: { statusCode: HttpStatus.NOT_FOUND, message: AppErrorCode.NOT_FOUND },
    [AppErrorCode.METHOD_NOT_ALLOWED]: { statusCode: HttpStatus.METHOD_NOT_ALLOWED, message: AppErrorCode.METHOD_NOT_ALLOWED },
    [AppErrorCode.PAYLOAD_TOO_LARGE]: { statusCode: HttpStatus.PAYLOAD_TOO_LARGE, message: AppErrorCode.PAYLOAD_TOO_LARGE },
    [AppErrorCode.UNSUPPORTED_MEDIA_TYPE]: { statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE, message: AppErrorCode.UNSUPPORTED_MEDIA_TYPE },
    [AppErrorCode.INTERNAL]: { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: AppErrorCode.INTERNAL },
};

export const ErrorCode = { ...AppErrorCode, ...AuthErrorCode, ...DappErrorCode };
export type ErrorCodeType = AppErrorCode | AuthErrorCode | DappErrorCode;

export const ErrorBody: { [code in ErrorCodeType]: { statusCode: HttpStatus; message: string } } = {
    ...AppErrorBody,
    ...AuthErrorBody,
    ...DappErrorBody,
};
