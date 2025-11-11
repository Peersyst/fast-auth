import { HttpStatus } from "@nestjs/common";

export enum RelayerErrorCodes {
    INVALID_VERIFY_PAYLOAD = "INVALID_VERIFY_PAYLOAD",
    INVALID_SIGN_PAYLOAD = "INVALID_SIGN_PAYLOAD",
    INVALID_GUARD_ID = "INVALID_GUARD_ID",
    INVALID_ALGORITHM = "INVALID_ALGORITHM",
}

export const RelayerErrorBody: Record<RelayerErrorCodes, { statusCode: HttpStatus; message: string }> = {
    [RelayerErrorCodes.INVALID_VERIFY_PAYLOAD]: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Invalid verify_payload",
    },
    [RelayerErrorCodes.INVALID_GUARD_ID]: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Invalid guard_id",
    },
    [RelayerErrorCodes.INVALID_ALGORITHM]: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Invalid algorithm",
    },
    [RelayerErrorCodes.INVALID_SIGN_PAYLOAD]: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Invalid sign_payload",
    },
};
