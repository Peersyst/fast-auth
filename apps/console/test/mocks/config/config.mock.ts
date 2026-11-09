import { getTestDataSourceOptions } from "@backend/test";
import * as entities from "@database/console/entities";
import { DynamicModule, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Auth0Config, Auth0ProvisionerName } from "../../../src/config/auth0.config";
import { ConfigServiceMock } from "./config.service.mock";

export const ADMIN_EMAIL = "admin@console.test";

/**
 * Returns the console configuration the tests run with, every outside service faked.
 * @returns The configuration, keyed by namespace as ConfigService reads it.
 */
export function testConfig() {
    return {
        server: {
            name: "console",
            port: 3000,
            publicUrl: "https://console.example.test",
            readyzTimeoutMs: 2000,
            shutdownDelayMs: 0,
            enableSwagger: false,
        },
        logger: { logLevel: "info", logFile: "app.log" },
        database: { ...getTestDataSourceOptions(Object.values(entities)), autoLoadEntities: true },
        auth0: <Auth0Config>{
            loginDomain: "login.console.test",
            consoleClientId: "test-console-client-id",
            provisioner: Auth0ProvisionerName.FAKE,
            management: null,
        },
        admin: { emails: [ADMIN_EMAIL], autoApprovalEnabled: false },
        slack: { webhookUrl: null, timeoutMs: 5000 },
    };
}

/**
 * Builds a ConfigService mock that serves the test config by dotted key, as ConfigService does.
 * @param overrides Namespaces to replace in the test config.
 * @returns The mock.
 */
export function createConfigServiceMock(overrides: Partial<ReturnType<typeof testConfig>> = {}) {
    const config: Record<string, unknown> = { ...testConfig(), ...overrides };
    const mock = new ConfigServiceMock();
    mock.get.mockImplementation((key: string) =>
        key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown> | undefined)?.[part], config),
    );
    return mock;
}

@Module({})
class ConfigStubModule {}

/**
 * Serves a ConfigService to every module under test, as the global ConfigModule does in the app.
 * @param configService The ConfigService or mock to serve.
 * @returns The global module.
 */
export function configStubModule(configService: unknown): DynamicModule {
    return {
        module: ConfigStubModule,
        global: true,
        providers: [{ provide: ConfigService, useValue: configService }],
        exports: [ConfigService],
    };
}
