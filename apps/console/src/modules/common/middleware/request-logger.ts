import { Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export type RequestLocals = { requestId: string };

const logger = new Logger("HTTP");

export function requestLogger(req: Request, res: Response<unknown, RequestLocals>, next: NextFunction): void {
    const start = process.hrtime.bigint();
    const { method, path } = req;
    const requestId = randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        logger.log(`${method} ${path} ${res.statusCode} ${durationMs.toFixed(1)}ms ${requestId}`);
    });
    next();
}
