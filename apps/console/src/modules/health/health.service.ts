import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmHealthIndicator } from "@nestjs/terminus";
import { ReadyzResponseDto } from "./dtos/readyz.dto";
import { HealthDependencyCheckerResult } from "./types/health-check";

@Injectable()
export class HealthService {
    private readonly logger = new Logger(HealthService.name);

    constructor(
        private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
        @Inject(ConfigService) private readonly configService: ConfigService,
    ) {}

    /**
     * Checks the health of the database using Terminus TypeORM health indicator, within the readyz timeout.
     * @returns The result of the database health check.
     */
    private async checkDatabase(): Promise<HealthDependencyCheckerResult> {
        try {
            const result = await this.typeOrmHealthIndicator.pingCheck("database", {
                timeout: this.configService.get<number>("server.readyzTimeoutMs"),
            });
            if (result.database?.status !== "up") throw new Error(String(result.database?.message ?? "Database is down"));
            return { status: "ok" };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`Database health check failed: ${errorMessage}`);
            return { status: "error", message: errorMessage };
        }
    }

    /**
     * Performs the database health check.
     * @returns The result of the health checks.
     */
    async checkHealth(): Promise<ReadyzResponseDto> {
        return ReadyzResponseDto.fromDependencyCheckers({
            database: await this.checkDatabase(),
        });
    }
}
