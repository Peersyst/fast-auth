import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getConfigEnv } from "@backend/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import type { IAuth0ProvisionerService } from "./interfaces/i-auth0-provisioner.service";
import { ProvisioningMetricsProvider } from "./provisioning.metrics";
import { AUTH0_PROVISIONER } from "./provisioning.tokens";

const AUTH0_HEALTH_CHECK = "auth0-health-check";

@Injectable()
export class ProvisioningScheduler implements OnApplicationBootstrap {
    private readonly logger = new Logger(ProvisioningScheduler.name);

    constructor(
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(AUTH0_PROVISIONER) private readonly provisioner: IAuth0ProvisionerService,
        private readonly metrics: ProvisioningMetricsProvider,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) {}

    /**
     * Checks Auth0 health now and then on the configured interval, except under CONFIG_ENV=test. The interval comes from config, so it is registered here instead of with a decorator.
     */
    onApplicationBootstrap(): void {
        if (getConfigEnv() === "test") return;
        void this.checkHealth();
        const interval = setInterval(() => void this.checkHealth(), this.configService.get<number>("auth0.healthCheckIntervalMs"));
        this.schedulerRegistry.addInterval(AUTH0_HEALTH_CHECK, interval);
    }

    /**
     * Sets console_auth0_up from one health check and logs a failure instead of throwing it.
     */
    async checkHealth(): Promise<void> {
        try {
            await this.provisioner.checkHealth();
            this.metrics.setAuth0Up(true);
        } catch (error) {
            this.metrics.setAuth0Up(false);
            this.logger.warn(`Auth0 health check failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
