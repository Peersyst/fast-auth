import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { HealthService } from "./health.service";

@Controller()
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    /**
     * Liveness probe endpoint.
     * @param res The response.
     * @returns If success 200 OK to indicate the application is running.
     */
    @Get("livez")
    livez(@Res() res: Response) {
        return res.status(HttpStatus.OK).json();
    }

    /**
     * Readiness probe endpoint.
     * Checks validation keys health before returning success.
     * @param res The response.
     * @returns If success 200 OK to indicate the application is running.
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
