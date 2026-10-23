import { Inject, Logger, Module } from "@nestjs/common";
import type { OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { makeGaugeProvider, makeHistogramProvider } from "@willsoto/nestjs-prometheus";
import { CONSOLE_CONFIG, ConfigEnv } from "../../config/console-config";
import type { ConsoleConfig } from "../../config/console-config";
import { Auth0ManagementProvisioner } from "./auth0-management.provisioner";
import { AUTH0_PROVISIONER } from "./auth0-provisioner";
import type { Auth0Provisioner } from "./auth0-provisioner";
import { FakeProvisioner } from "./fake.provisioner";
import { ProvisioningMetric, ProvisioningMetrics } from "./provisioning.metrics";

export const HEALTH_CHECK_INTERVAL_MS = 10 * 60 * 1000;

function createProvisioner(config: ConsoleConfig, metrics: ProvisioningMetrics): Auth0Provisioner {
    const { auth0 } = config;
    switch (auth0.provisioner) {
        case "management":
            return new Auth0ManagementProvisioner(auth0, config.server.env, metrics);
        case "fake":
            return new FakeProvisioner();
    }
}

@Module({
    providers: [
        ProvisioningMetrics,
        makeHistogramProvider({
            name: ProvisioningMetric.Auth0RequestDurationSeconds,
            help: "Duration of Auth0 Management API calls in seconds, including any token request they wait on, by operation and outcome",
            labelNames: ["op", "outcome"],
            buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        }),
        makeGaugeProvider({ name: ProvisioningMetric.Auth0Up, help: "1 when the last Auth0 health check succeeded, 0 otherwise" }),
        { provide: AUTH0_PROVISIONER, inject: [CONSOLE_CONFIG, ProvisioningMetrics], useFactory: createProvisioner },
    ],
    exports: [AUTH0_PROVISIONER],
})
export class ProvisioningModule implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(ProvisioningModule.name);
    private timer: NodeJS.Timeout | undefined;

    constructor(
        @Inject(CONSOLE_CONFIG) private readonly config: ConsoleConfig,
        @Inject(AUTH0_PROVISIONER) private readonly provisioner: Auth0Provisioner,
        private readonly metrics: ProvisioningMetrics,
    ) {}

    onApplicationBootstrap(): void {
        if (this.config.server.env === ConfigEnv.Test) return;
        void this.checkHealth();
        this.timer = setInterval(() => void this.checkHealth(), HEALTH_CHECK_INTERVAL_MS).unref();
    }

    onModuleDestroy(): void {
        clearInterval(this.timer);
    }

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
