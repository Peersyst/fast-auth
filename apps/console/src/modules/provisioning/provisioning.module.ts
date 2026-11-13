import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getConfigEnv } from "@backend/config";
import { Auth0Config } from "../../config/auth0.config";
import { IAuth0ProvisionerService } from "./interfaces/i-auth0-provisioner.service";
import { Auth0ManagementService } from "./providers/auth0-management/auth0-management.service";
import { FakeProvisionerService } from "./providers/fake/fake.service";
import { ProvisioningMetrics, ProvisioningMetricsProvider } from "./provisioning.metrics";
import { createMetricsProvider } from "../common/metric/metric";
import { AUTH0_PROVISIONER } from "./provisioning.tokens";

/**
 * Builds the provisioner that config selects.
 * @param configService The config service.
 * @param metrics The metrics the Management API provisioner records its calls on.
 * @returns The Management API provisioner, or the in-memory fake.
 */
function createProvisioner(configService: ConfigService, metrics: ProvisioningMetricsProvider): IAuth0ProvisionerService {
    const { management } = configService.get<Auth0Config>("auth0")!;
    return management === null ? new FakeProvisionerService() : new Auth0ManagementService(management, getConfigEnv(), metrics);
}

@Module({
    providers: [
        ...createMetricsProvider(ProvisioningMetricsProvider, ProvisioningMetrics),
        { provide: AUTH0_PROVISIONER, inject: [ConfigService, ProvisioningMetricsProvider], useFactory: createProvisioner },
    ],
    exports: [AUTH0_PROVISIONER],
})
export class ProvisioningModule {}
