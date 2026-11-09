import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger, Provider } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { Response } from "express";
import { BusinessException } from "./business.exception";
import { ErrorBody, ErrorCode, ErrorCodeType } from "./error-codes";

/**
 * The body of every error answer: the status and the error code, plus the refused fields of a validation failure.
 */
export type ErrorResponse = { statusCode: number; message: ErrorCodeType; fields?: string[] };

/**
 * The code each non-business error status answers with. Any other status answers INTERNAL.
 */
const STATUS_CODES: Partial<Record<number, ErrorCodeType>> = {
    [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
    [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHENTICATED,
    [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN_ROLE,
    [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
    [HttpStatus.METHOD_NOT_ALLOWED]: ErrorCode.METHOD_NOT_ALLOWED,
    [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
    [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: ErrorCode.UNSUPPORTED_MEDIA_TYPE,
};

type ErrorLike = { status?: unknown; statusCode?: unknown; headers?: unknown; errors?: unknown };

/**
 * Reads the HTTP status a thrown value carries: Nest's, the OpenAPI validator's or the body parser's.
 * @param exception The thrown value.
 * @returns The status, or undefined when it carries none.
 */
function statusOf(exception: unknown): number | undefined {
    if (exception instanceof HttpException) return exception.getStatus();
    const { status, statusCode } = (exception ?? {}) as ErrorLike;
    const value = typeof status === "number" ? status : statusCode;
    return typeof value === "number" ? value : undefined;
}

/**
 * Names the property a ValidationPipe message refuses. An unknown property reads "property x should not exist", and any
 * other message starts with the property path.
 * @param message The ValidationPipe message.
 * @returns The property path.
 */
function pipeField(message: string): string {
    return /^property (\S+) should not exist$/.exec(message)?.[1] ?? message.split(" ", 1)[0];
}

/**
 * Names the property an OpenAPI validator error path refuses, without its request part: `/body/name` is `name`.
 * @param path The error path.
 * @returns The property path.
 */
function validatorField(path: string): string {
    return path.replace(/^[./]?(body|query|params|path|headers)[./]?/, "").replace(/\//g, ".");
}

/**
 * Reads the properties a validation failure refused, from the ValidationPipe's message list or the OpenAPI validator's errors.
 * @param exception The thrown value.
 * @returns The refused properties, or undefined when the error names none.
 */
function refusedFields(exception: unknown): string[] | undefined {
    const pipeMessages = exception instanceof HttpException ? (exception.getResponse() as { message?: unknown }).message : undefined;
    const validatorErrors = (exception as ErrorLike).errors;
    const fields = Array.isArray(pipeMessages)
        ? pipeMessages.filter((message): message is string => typeof message === "string").map(pipeField)
        : Array.isArray(validatorErrors)
          ? validatorErrors
                .map((item) => (item as { path?: unknown }).path)
                .filter((path): path is string => typeof path === "string")
                .map(validatorField)
          : [];
    const unique = [...new Set(fields.filter((field) => field !== ""))];
    return unique.length > 0 ? unique : undefined;
}

/**
 * Answers every error with a business error body, so a client only ever reads a status and a code.
 */
@Catch()
export class BusinessExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(BusinessExceptionFilter.name);

    /**
     * Answers the error.
     * @param exception The thrown value.
     * @param host The arguments host.
     */
    catch(exception: unknown, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<Response>();
        const { headers } = (exception ?? {}) as ErrorLike;
        if (headers && typeof headers === "object") response.header(headers as Record<string, string>);
        const body = this.toBody(exception);
        response.status(body.statusCode).json(body);
    }

    /**
     * Maps a thrown value to the business error body it answers with.
     * @param exception The thrown value.
     * @returns The body, whose status code the answer uses.
     */
    toBody(exception: unknown): ErrorResponse {
        if (exception instanceof BusinessException) return exception.getResponse() as ErrorResponse;
        const status = statusOf(exception);
        const code = status === undefined ? undefined : STATUS_CODES[status];
        if (code === undefined) {
            this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
            return { statusCode: ErrorBody[ErrorCode.INTERNAL].statusCode, message: ErrorCode.INTERNAL };
        }
        const fields = code === ErrorCode.VALIDATION_FAILED ? refusedFields(exception) : undefined;
        return { statusCode: ErrorBody[code].statusCode, message: code, ...(fields && { fields }) };
    }
}

/**
 * Registers the filter for every route, in the app and in the integration tests alike.
 */
export const BUSINESS_EXCEPTION_FILTER: Provider = { provide: APP_FILTER, useClass: BusinessExceptionFilter };
