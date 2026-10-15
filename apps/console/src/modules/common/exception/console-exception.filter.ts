import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, Logger } from "@nestjs/common";
import type { Response } from "express";
import { error as OpenApiError } from "express-openapi-validator";
import { QueryFailedError } from "typeorm";
import { AuthErrorCode } from "../../auth/error/auth-error-codes";
import type { RequestLocals } from "../middleware/request-logger";
import type { ErrorDetail } from "../responses/error.response";
import { ErrorResponse } from "../responses/error.response";
import { CommonErrorCode } from "./common-error-codes";
import { ConsoleException } from "./console.exception";
import type { ConsoleErrorCode } from "./error-codes";

const CODE_BY_STATUS: Partial<Record<number, ConsoleErrorCode>> = {
    400: CommonErrorCode.VALIDATION_FAILED,
    401: AuthErrorCode.UNAUTHENTICATED,
    404: CommonErrorCode.NOT_FOUND,
    405: CommonErrorCode.VALIDATION_FAILED,
    413: CommonErrorCode.VALIDATION_FAILED,
    415: CommonErrorCode.VALIDATION_FAILED,
};

export function postgresErrorCode(exception: unknown): ConsoleErrorCode | undefined {
    if (!(exception instanceof QueryFailedError)) return undefined;
    const { code, constraint } = exception.driverError as { code?: string; constraint?: string };
    if (code === "23505" && constraint === "dapps_owner_email_live") return "DAPP_ALREADY_EXISTS";
    if (code === "55P03") return "DAPP_CHANGED";
    return undefined;
}

/**
 * Reads the HTTP status of a Nest exception or of any error that carries a numeric status, such as body-parser's.
 * @param exception The thrown value.
 * @returns The status, or undefined when there is none.
 */
function statusOf(exception: unknown): number | undefined {
    if (exception instanceof HttpException) return exception.getStatus();
    const status = typeof exception === "object" && exception !== null && "status" in exception ? exception.status : undefined;
    return typeof status === "number" ? status : undefined;
}

// Errors about a request field start with its location; errors about a malformed request carry the URL path instead.
const FIELD_PATH = /^\/(body|params|query|headers|cookies)(\/|$)/;

/**
 * Turns an OpenAPI validator 400 into one detail per field error, dropping errors that name no field.
 * @param exception The thrown value.
 * @returns The details, or undefined when there are none.
 */
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

    /**
     * Sends every uncaught error as the error envelope.
     * @param exception The thrown value.
     * @param host The arguments host of the failed request.
     */
    catch(exception: unknown, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<Response<unknown, Partial<RequestLocals>>>();
        const body = this.toErrorResponse(exception, response.locals.requestId);
        response.status(body.statusCode).json(body);
    }

    /**
     * Maps a thrown value to the error envelope, logging anything it cannot map and answering INTERNAL.
     * @param exception The thrown value.
     * @param requestId The request id to log with an unmapped error.
     * @returns The error envelope.
     */
    toErrorResponse(exception: unknown, requestId: string | undefined): ErrorResponse {
        if (exception instanceof ConsoleException) return exception.body;

        const postgresCode = postgresErrorCode(exception);
        if (postgresCode) return new ConsoleException(postgresCode).body;

        const status = statusOf(exception);
        const code = status === undefined ? undefined : CODE_BY_STATUS[status];
        if (status !== undefined && code) {
            return { ...ErrorResponse.fromCode(code, validatorDetails(exception)), statusCode: status };
        }

        this.logger.error(
            `Unhandled error (request ${requestId ?? "none"})`,
            exception instanceof Error ? exception.stack : String(exception),
        );
        return new ConsoleException(CommonErrorCode.INTERNAL).body;
    }
}
