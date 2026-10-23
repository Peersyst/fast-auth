import { Controller, Get, Logger } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { DataSource } from "typeorm";
import { ApiErrorResponses } from "../common/exception/api-error-responses.decorator";
import { ConsoleException } from "../common/exception/console.exception";
import { HealthResponse } from "./response/health.response";

const READYZ_TIMEOUT_MS = 2_000;

@ApiTags("health")
@ApiErrorResponses()
@Controller()
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    constructor(private readonly dataSource: DataSource) {}

    @Get("livez")
    @ApiOkResponse({ type: HealthResponse })
    livez(): HealthResponse {
        return { status: "ok" };
    }

    @Get("readyz")
    @ApiOkResponse({ type: HealthResponse })
    async readyz(): Promise<HealthResponse> {
        let timer: NodeJS.Timeout | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Database did not answer within ${READYZ_TIMEOUT_MS} ms`)), READYZ_TIMEOUT_MS);
        });
        try {
            await Promise.race([this.dataSource.query("SELECT 1"), timeout]);
        } catch (error) {
            this.logger.warn(`Not ready: ${error instanceof Error ? error.message : String(error)}`);
            throw new ConsoleException("UNAVAILABLE");
        } finally {
            clearTimeout(timer);
        }
        return { status: "ok" };
    }
}
