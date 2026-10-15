import { HttpException } from "@nestjs/common";
import type { ErrorDetail, ErrorResponse } from "../response/error.response";
import type { ConsoleErrorCode } from "./error-codes";
import { ERROR_CODES } from "./error-codes";

export class ConsoleException extends HttpException {
    readonly body: ErrorResponse;

    constructor(
        readonly code: ConsoleErrorCode,
        details?: ErrorDetail[],
    ) {
        const { status, message } = ERROR_CODES[code];
        const body: ErrorResponse = { statusCode: status, code, message, ...(details && { details }) };
        super(body, status);
        this.body = body;
    }
}
