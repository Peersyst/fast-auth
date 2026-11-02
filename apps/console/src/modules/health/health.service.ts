import type { BeforeApplicationShutdown } from "@nestjs/common";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import type { ConsoleConfig } from "../../config/console-config";
import { CommonErrorCode } from "../common/exception/common-error-codes";
import { ConsoleException } from "../common/exception/console.exception";

@Injectable()
export class HealthService implements BeforeApplicationShutdown {
    private readonly logger = new Logger(HealthService.name);
    private shuttingDown = false;

    constructor(
        private readonly dataSource: DataSource,
        @Inject(ConfigService) private readonly configService: ConfigService<ConsoleConfig, true>,
    ) {}

    /**
     * Starts failing the readiness check, then holds the shutdown for the configured delay so the load balancer stops routing here first.
     */
    async beforeApplicationShutdown(): Promise<void> {
        this.shuttingDown = true;
        const delayMs = this.configService.get("server.shutdownDelayMs", { infer: true });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    /**
     * Checks that the app can take traffic: it is not shutting down and the database answers within the readyz timeout.
     */
    async checkReady(): Promise<void> {
        if (this.shuttingDown) throw new ConsoleException(CommonErrorCode.UNAVAILABLE);
        const readyzTimeoutMs = this.configService.get("server.readyzTimeoutMs", { infer: true });
        let timer: NodeJS.Timeout | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Database did not answer within ${readyzTimeoutMs} ms`)), readyzTimeoutMs);
        });
        try {
            await Promise.race([this.dataSource.query("SELECT 1"), timeout]);
        } catch (error) {
            this.logger.warn(`Not ready: ${error instanceof Error ? error.message : String(error)}`);
            throw new ConsoleException(CommonErrorCode.UNAVAILABLE);
        } finally {
            clearTimeout(timer);
        }
    }
}
