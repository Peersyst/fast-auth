import { HttpStatus } from "@nestjs/common";
import { RelayerErrorBody, RelayerErrorCodes } from "../../relayer/error/relayer-error-codes";

// Define app error codes
enum AppErrorCode {}

export const ErrorCode = { ...AppErrorCode, ...RelayerErrorCodes };
export type ErrorCodeType = AppErrorCode | RelayerErrorCodes;

export const ErrorBody: { [code in ErrorCodeType]: { statusCode: HttpStatus; message: string } } = {
    ...RelayerErrorBody,
};
