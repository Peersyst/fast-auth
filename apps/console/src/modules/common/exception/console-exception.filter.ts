import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, Logger } from "@nestjs/common";
import type { Response } from "express";
import { error as OpenApiError } from "express-openapi-validator";
import type { RequestLocals } from "../middleware/request-logger";
import type { ErrorDetail, ErrorResponse } from "../response/error.response";
import { ConsoleException } from "./console.exception";
import type { ConsoleErrorCode } from "./error-codes";
import { ERROR_CODES } from "./error-codes";

const CODE_BY_STATUS: Partial<Record<number, ConsoleErrorCode>> = {
    400: "VALIDATION_FAILED",
    404: "NOT_FOUND",
    405: "VALIDATION_FAILED",
    406: "VALIDATION_FAILED",
    413: "VALIDATION_FAILED",
    415: "VALIDATION_FAILED",
};

function statusOf(exception: unknown): number | undefined {
    if (exception instanceof HttpException) return exception.getStatus();
    const status = typeof exception === "object" && exception !== null && "status" in exception ? exception.status : undefined;
    return typeof status === "number" ? status : undefined;
}

// Errors about a request field start with its location; errors about a malformed request carry the URL path instead.
const FIELD_PATH = /^\/(body|params|query|headers|cookies)(\/|$)/;

function validatorDetails(exception: unknown): ErrorDetail[] | undefined {
    if (!(exception instanceof OpenApiError.BadRequest)) return undefined;
    const details = exception.errors
        .filter(({ path }) => FIELD_PATH.test(path))
        .map(({ path, errorCode }) => {
            const [, location = "", ...field] = path.split("/");
            return {
                field: field.length > 0 ? field.join(".") : location,
                constraint: errorCode?.replace(/\.openapi\.validation$/, "") ?? "invalid",
            };
        });
    return details.length > 0 ? details : undefined;
}

@Catch()
export class ConsoleExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ConsoleExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<Response<unknown, Partial<RequestLocals>>>();
        const body = this.toErrorResponse(exception, response.locals.requestId);
        response.status(body.statusCode).json(body);
    }

    toErrorResponse(exception: unknown, requestId: string | undefined): ErrorResponse {
        if (exception instanceof ConsoleException) return exception.body;

        const status = statusOf(exception);
        const code = status === undefined ? undefined : CODE_BY_STATUS[status];
        if (status !== undefined && code) {
            const details = validatorDetails(exception);
            return { statusCode: status, code, message: ERROR_CODES[code].message, ...(details && { details }) };
        }

        this.logger.error(
            `Unhandled error (request ${requestId ?? "none"})`,
            exception instanceof Error ? exception.stack : String(exception),
        );
        return new ConsoleException("INTERNAL").body;
    }
}
