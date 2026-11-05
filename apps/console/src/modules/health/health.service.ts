import { BeforeApplicationShutdown, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmHealthIndicator } from "@nestjs/terminus";
import { ReadyzResponseDto } from "./dtos/readyz.dto";
import { HealthDependencyCheckerResult } from "./types/health-check";

@Injectable()
export class HealthService implements BeforeApplicationShutdown {
    private readonly logger = new Logger(HealthService.name);
    private shuttingDown = false;

    constructor(
        private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
        @Inject(ConfigService) private readonly configService: ConfigService,
    ) {}

    /**
     * Starts failing the readiness check, then holds the shutdown for the configured delay so the load balancer stops routing here first.
     */
    async beforeApplicationShutdown(): Promise<void> {
        this.shuttingDown = true;
        await new Promise((resolve) => setTimeout(resolve, this.configService.get<number>("server.shutdownDelayMs")));
    }

    /**
     * Fails once the app starts shutting down, so the load balancer drains it.
     * @returns The result of the shutdown check.
     */
    private checkShutdown(): HealthDependencyCheckerResult {
        return this.shuttingDown ? { status: "error", message: "Shutting down" } : { status: "ok" };
    }

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
     * Performs the shutdown and database health checks.
     * @returns The result of the health checks.
     */
    async checkHealth(): Promise<ReadyzResponseDto> {
        return ReadyzResponseDto.fromDependencyCheckers({
            shutdown: this.checkShutdown(),
            database: await this.checkDatabase(),
        });
    }
}
