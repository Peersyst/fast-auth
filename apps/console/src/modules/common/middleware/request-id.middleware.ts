import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Tags each response with a fresh X-Request-Id.
 * @param _req The incoming request.
 * @param res The response.
 * @param next Hands the request to the next middleware.
 */
export function requestId(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader("X-Request-Id", randomUUID());
    next();
}
