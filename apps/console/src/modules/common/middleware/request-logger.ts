import { Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export type RequestLocals = { requestId: string };

const logger = new Logger("HTTP");

/**
 * Tags each request with an X-Request-Id and logs its method, path, status and duration once it closes.
 * @param req The incoming request.
 * @param res The response, whose locals receive the request id.
 * @param next Hands the request to the next middleware.
 */
export function requestLogger(req: Request, res: Response<unknown, RequestLocals>, next: NextFunction): void {
    const start = process.hrtime.bigint();
    const { method, path } = req;
    const requestId = randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    res.on("close", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const status = res.writableFinished ? res.statusCode : "aborted";
        logger.log(`${method} ${path} ${status} ${durationMs.toFixed(1)}ms ${requestId}`);
    });
    next();
}
