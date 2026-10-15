import { Global, Module } from "@nestjs/common";
import type { Type } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import type { TestingModuleBuilder } from "@nestjs/testing";
import type { ConsoleConfig, ManagementAuth0Config, SesEmailConfig } from "../../src/config/console-config";
import { Auth0ProvisionerName, ConfigEnv, EmailProviderName, LogLevel, NearNetwork } from "../../src/config/console-config";

export const TEST_CONFIG: ConsoleConfig = {
    server: {
        env: ConfigEnv.TEST,
        port: 3000,
        publicUrl: "https://console.example.test",
        metricsPort: 9464,
        readyzTimeoutMs: 2000,
        shutdownDelayMs: 0,
    },
    logger: { level: LogLevel.WARN, file: null },
    database: {
        host: "localhost",
        port: 5432,
        name: "console",
        user: "console",
        password: "console",
        poolSize: 10,
        ssl: false,
        connectTimeoutMs: 5000,
        lockTimeoutMs: 10000,
    },
    auth0: {
        loginDomain: "login.example.test",
        consoleClientId: "console-client",
        provisioner: Auth0ProvisionerName.FAKE,
        nearNetwork: NearNetwork.TESTNET,
        jwksTimeoutMs: 6000,
        jwksRefetchCooldownMs: 30000,
        healthCheckIntervalMs: 600000,
    },
    throttle: { submitDappPerMinute: 5, editDappPerMinute: 10, adminMutationPerMinute: 60 },
    email: { provider: EmailProviderName.FAKE },
    admin: { emails: new Set(["admin@example.test"]) },
    slack: { webhookUrl: null },
};

export const MANAGEMENT_AUTH0: ManagementAuth0Config = {
    ...TEST_CONFIG.auth0,
    provisioner: Auth0ProvisionerName.MANAGEMENT,
    mgmtDomain: "tenant.eu.auth0.com",
    m2mClientId: "m2m-id",
    m2mClientSecret: "m2m-secret",
    templateClientId: "template-client",
    mgmtRetryAfterMs: 1000,
    mgmtMaxRetryAfterMs: 10000,
    mgmtTimeoutMs: 10000,
};

export const SES_EMAIL: SesEmailConfig = { provider: "ses", from: "no-reply@auth.example.test", region: "eu-west-1" };

/**
 * Starts a testing module that imports these modules next to a global ConfigService serving this config.
 * @param config The config.
 * @param imports The modules under test.
 * @returns The testing module builder.
 */
export function createTestingModuleWithConfig(config: ConsoleConfig, ...imports: Type[]): TestingModuleBuilder {
    @Global()
    @Module({ providers: [{ provide: ConfigService, useValue: new ConfigService(config) }], exports: [ConfigService] })
    class ConfigStubModule {}

    return Test.createTestingModule({ imports: [ConfigStubModule, ...imports] });
}
