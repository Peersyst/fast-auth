import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { makeGaugeProvider, makeHistogramProvider } from "@willsoto/nestjs-prometheus";
import { Auth0ProvisionerName } from "../../config/console-config";
import type { ConsoleConfig } from "../../config/console-config";
import { Auth0ManagementProvisioner } from "./auth0-management.provisioner";
import { AUTH0_PROVISIONER } from "./auth0-provisioner";
import type { Auth0Provisioner } from "./auth0-provisioner";
import { FakeProvisioner } from "./fake.provisioner";
import { ProvisioningMetric, ProvisioningMetrics } from "./provisioning.metrics";
import { ProvisioningScheduler } from "./provisioning.scheduler";

/**
 * Builds the provisioner that config selects.
 * @param configService The console config.
 * @param metrics The metrics the Management API provisioner records its calls on.
 * @returns The Management API provisioner, or the in-memory fake.
 */
function createProvisioner(configService: ConfigService<ConsoleConfig, true>, metrics: ProvisioningMetrics): Auth0Provisioner {
    const auth0 = configService.get("auth0", { infer: true });
    switch (auth0.provisioner) {
        case Auth0ProvisionerName.MANAGEMENT:
            return new Auth0ManagementProvisioner(auth0, configService.get("server.env", { infer: true }), metrics);
        case Auth0ProvisionerName.FAKE:
            return new FakeProvisioner();
    }
}

@Module({
    providers: [
        ProvisioningMetrics,
        makeHistogramProvider({
            name: ProvisioningMetric.AUTH0_REQUEST_DURATION_SECONDS,
            help: "Duration of Auth0 Management API calls in seconds, including any token request they wait on, by operation and outcome",
            labelNames: ["op", "outcome"],
            buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        }),
        makeGaugeProvider({ name: ProvisioningMetric.AUTH0_UP, help: "1 when the last Auth0 health check succeeded, 0 otherwise" }),
        { provide: AUTH0_PROVISIONER, inject: [ConfigService, ProvisioningMetrics], useFactory: createProvisioner },
        ProvisioningScheduler,
    ],
    exports: [AUTH0_PROVISIONER],
})
export class ProvisioningModule {}
