import { Inject, Injectable, Logger } from "@nestjs/common";
import type { OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConfigEnv } from "../../config/console-config";
import type { ConsoleConfig } from "../../config/console-config";
import { AUTH0_PROVISIONER } from "./auth0-provisioner";
import type { Auth0Provisioner } from "./auth0-provisioner";
import { ProvisioningMetrics } from "./provisioning.metrics";

/**
 * Checks Auth0 health on an interval and records the result on console_auth0_up.
 */
@Injectable()
export class ProvisioningScheduler implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(ProvisioningScheduler.name);
    private timer: NodeJS.Timeout | undefined;

    constructor(
        @Inject(ConfigService) private readonly configService: ConfigService<ConsoleConfig, true>,
        @Inject(AUTH0_PROVISIONER) private readonly provisioner: Auth0Provisioner,
        private readonly metrics: ProvisioningMetrics,
    ) {}

    /**
     * Checks Auth0 health now and then on every interval, except under CONFIG_ENV=test.
     */
    onApplicationBootstrap(): void {
        if (this.configService.get("server.env", { infer: true }) === ConfigEnv.TEST) return;
        void this.checkHealth();
        this.timer = setInterval(
            () => void this.checkHealth(),
            this.configService.get("auth0.healthCheckIntervalMs", { infer: true }),
        ).unref();
    }

    /**
     * Stops the health check interval.
     */
    onModuleDestroy(): void {
        clearInterval(this.timer);
    }

    /**
     * Sets console_auth0_up from one health check and logs a failure instead of throwing it.
     */
    private async checkHealth(): Promise<void> {
        try {
            await this.provisioner.checkHealth();
            this.metrics.setAuth0Up(true);
        } catch (error) {
            this.metrics.setAuth0Up(false);
            this.logger.warn(`Auth0 health check failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
