import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";

@Controller()
export class HealthController {
    /**
     * Liveness probe endpoint.
     * Returns 200 OK to indicate the application is running.
     * @param res The response object.
     * @returns The response with status 200 OK.
     */
    @Get("livez")
    async livez(@Res() res: Response) {
        return res.status(HttpStatus.OK).json({ status: "ok" });
    }

    /**
     * Readiness probe endpoint.
     * The broker keeps its state in memory and has no dependency to check, so it is ready once it answers.
     * @param res The response object.
     * @returns The response with status 200 OK.
     */
    @Get("readyz")
    async readyz(@Res() res: Response) {
        return res.status(HttpStatus.OK).json({ status: "ok", checks: {} });
    }
}
