import { HttpStatus } from "@nestjs/common";
import { AuthErrorBody, AuthErrorCode } from "../../auth/error/auth.error-codes";
import { DappErrorBody, DappErrorCode } from "../../dapp/error/dapp.error-codes";

// Define app error codes
enum AppErrorCode {}

export const ErrorCode = { ...AppErrorCode, ...AuthErrorCode, ...DappErrorCode };
export type ErrorCodeType = AppErrorCode | AuthErrorCode | DappErrorCode;

export const ErrorBody: { [code in ErrorCodeType]: { statusCode: HttpStatus; message: string } } = {
    ...AuthErrorBody,
    ...DappErrorBody,
};
