import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { HealthService } from "./health.service";

@Controller()
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

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
     * Checks that the database answers before returning success.
     * @param res The response object.
     * @returns The response with status 200 OK or 503 SERVICE_UNAVAILABLE.
     */
    @Get("readyz")
    async readyz(@Res() res: Response) {
        const healthCheck = await this.healthService.checkHealth();

        if (healthCheck.status === "ok") {
            return res.status(HttpStatus.OK).json(healthCheck);
        } else {
            return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(healthCheck);
        }
    }
}
