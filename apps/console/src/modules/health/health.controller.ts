import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { HealthService } from "./health.service";
import { HealthResponse } from "./responses/health.response";

@ApiTags("health")
@ApiErrorResponses()
@Controller()
export class HealthController {
    constructor(private readonly health: HealthService) {}

    @Get("livez")
    @ApiOkResponse({ type: HealthResponse })
    async livez(): Promise<HealthResponse> {
        return HealthResponse.ok();
    }

    @Get("readyz")
    @ApiOkResponse({ type: HealthResponse })
    async readyz(): Promise<HealthResponse> {
        await this.health.checkReady();
        return HealthResponse.ok();
    }
}
