import { HttpStatus } from "@nestjs/common";

export enum DappErrorCode {
    DAPP_NOT_FOUND = "DAPP_NOT_FOUND",
    DAPP_ALREADY_EXISTS = "DAPP_ALREADY_EXISTS",
    INVALID_TRANSITION = "INVALID_TRANSITION",
    NO_PENDING_CHANGE = "NO_PENDING_CHANGE",
    DAPP_CHANGED = "DAPP_CHANGED",
    PROVISIONING_REJECTED = "PROVISIONING_REJECTED",
    PROVISIONING_FAILED = "PROVISIONING_FAILED",
}

export const DappErrorBody: Record<DappErrorCode, { statusCode: HttpStatus; message: string }> = {
    [DappErrorCode.DAPP_NOT_FOUND]: {
        statusCode: HttpStatus.NOT_FOUND,
        message: DappErrorCode.DAPP_NOT_FOUND,
    },
    [DappErrorCode.DAPP_ALREADY_EXISTS]: {
        statusCode: HttpStatus.CONFLICT,
        message: DappErrorCode.DAPP_ALREADY_EXISTS,
    },
    [DappErrorCode.INVALID_TRANSITION]: {
        statusCode: HttpStatus.CONFLICT,
        message: DappErrorCode.INVALID_TRANSITION,
    },
    [DappErrorCode.NO_PENDING_CHANGE]: {
        statusCode: HttpStatus.CONFLICT,
        message: DappErrorCode.NO_PENDING_CHANGE,
    },
    [DappErrorCode.DAPP_CHANGED]: {
        statusCode: HttpStatus.CONFLICT,
        message: DappErrorCode.DAPP_CHANGED,
    },
    [DappErrorCode.PROVISIONING_REJECTED]: {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: DappErrorCode.PROVISIONING_REJECTED,
    },
    [DappErrorCode.PROVISIONING_FAILED]: {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: DappErrorCode.PROVISIONING_FAILED,
    },
};
