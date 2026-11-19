import { Controller, Get } from "@nestjs/common";

/**
 * Probes. The broker depends on nothing it could check: Auth0 being down only fails the sign-ins.
 */
@Controller()
export class HealthController {
    /**
     * Liveness probe.
     * @returns The status.
     */
    @Get("livez")
    livez(): { status: "ok" } {
        return { status: "ok" };
    }

    /**
     * Readiness probe.
     * @returns The status.
     */
    @Get("readyz")
    readyz(): { status: "ok" } {
        return { status: "ok" };
    }
}
