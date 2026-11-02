import { HttpException } from "@nestjs/common";
import type { ErrorDetail } from "../responses/error.response";
import { ErrorResponse } from "../responses/error.response";
import type { ConsoleErrorCode } from "./error-codes";

export class ConsoleException extends HttpException {
    readonly body: ErrorResponse;

    constructor(
        readonly code: ConsoleErrorCode,
        details?: ErrorDetail[],
    ) {
        const body = ErrorResponse.fromCode(code, details);
        super(body, body.statusCode);
        this.body = body;
    }
}
