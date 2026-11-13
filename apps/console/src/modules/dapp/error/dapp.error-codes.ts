import { HttpStatus } from "@nestjs/common";

export enum DappErrorCode {
    DAPP_NOT_FOUND = "DAPP_NOT_FOUND",
    DAPP_CHANGE_NOT_FOUND = "DAPP_CHANGE_NOT_FOUND",
    DAPP_ALREADY_EXISTS = "DAPP_ALREADY_EXISTS",
    INVALID_TRANSITION = "INVALID_TRANSITION",
}

export const DappErrorBody: Record<DappErrorCode, { statusCode: HttpStatus; message: string }> = {
    [DappErrorCode.DAPP_NOT_FOUND]: {
        statusCode: HttpStatus.NOT_FOUND,
        message: DappErrorCode.DAPP_NOT_FOUND,
    },
    [DappErrorCode.DAPP_CHANGE_NOT_FOUND]: {
        statusCode: HttpStatus.NOT_FOUND,
        message: DappErrorCode.DAPP_CHANGE_NOT_FOUND,
    },
    [DappErrorCode.DAPP_ALREADY_EXISTS]: {
        statusCode: HttpStatus.CONFLICT,
        message: DappErrorCode.DAPP_ALREADY_EXISTS,
    },
    [DappErrorCode.INVALID_TRANSITION]: {
        statusCode: HttpStatus.CONFLICT,
        message: DappErrorCode.INVALID_TRANSITION,
    },
};
