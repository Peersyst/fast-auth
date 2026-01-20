import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Response } from "express";
import { error } from "express-openapi-validator";
import { HttpError } from "express-openapi-validator/dist/framework/types";

@Catch(...Object.values(error))
export class ErrorFilter implements ExceptionFilter {
    /**
     * Catches and handles HTTP errors.
     * @param err The HTTP error.
     * @param host The arguments host.
     */
    catch(err: HttpError, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        response.status(err.status).header(err.headers).json({
            statusCode: err.status,
            message: err.message,
        });
    }
}

export class ApiException {
    @ApiProperty({ required: true, type: Number })
    statusCode: number;
    @ApiProperty({ required: true, type: String })
    message: string;
}
