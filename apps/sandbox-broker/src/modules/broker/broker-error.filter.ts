import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { DappError, PageError, TokenError } from "./broker.errors";
import { deliver, renderPage } from "./responses";

/**
 * Answers each broker error where it belongs: back to the dApp, on a page of the broker's, or as token endpoint JSON.
 */
@Catch()
export class BrokerErrorFilter implements ExceptionFilter {
    private readonly logger = new Logger(BrokerErrorFilter.name);

    /**
     * Writes the error response.
     * @param exception The error.
     * @param host The request context.
     */
    catch(exception: unknown, host: ArgumentsHost): void {
        const http = host.switchToHttp();
        const res = http.getResponse<Response>();

        if (exception instanceof DappError) {
            deliver(res, exception.dapp, { error: exception.error, error_description: exception.description });
        } else if (exception instanceof PageError) {
            renderPage(res, exception.status, exception.message);
        } else if (exception instanceof TokenError) {
            res.status(exception.status).json({ error: exception.error, error_description: exception.description });
        } else {
            // A malformed body, for instance. Anything else is a bug.
            const status = exception instanceof HttpException ? exception.getStatus() : 500;
            if (status >= 500) this.logger.error(exception instanceof Error ? exception.stack : String(exception));
            if (http.getRequest<Request>().method === "POST") {
                res.status(status).json({
                    error: status >= 500 ? "server_error" : "invalid_request",
                    error_description: "The request failed",
                });
            } else {
                renderPage(res, status, "Something went wrong. Go back to the app and try again.");
            }
        }
    }
}
