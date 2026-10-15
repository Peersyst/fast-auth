import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Gauge, Histogram } from "prom-client";
import { MANAGEMENT_AUTH0, TEST_CONFIG } from "../../../test/utils/test-config";
import { CONSOLE_CONFIG } from "../../config/console-config";
import type { Auth0ProvisionerName, ConfigEnv, ConsoleConfig } from "../../config/console-config";
import { Auth0ManagementProvisioner } from "./auth0-management.provisioner";
import { AUTH0_PROVISIONER } from "./auth0-provisioner";
import { FakeProvisioner } from "./fake.provisioner";
import { HEALTH_CHECK_INTERVAL_MS, ProvisioningModule } from "./provisioning.module";
import { ProvisioningMetrics } from "./provisioning.metrics";

const makeConfig = (env: ConfigEnv, provisioner: Auth0ProvisionerName): ConsoleConfig => ({
    ...TEST_CONFIG,
    server: { ...TEST_CONFIG.server, env },
    auth0: provisioner === "management" ? MANAGEMENT_AUTH0 : TEST_CONFIG.auth0,
});

describe("ProvisioningModule", () => {
    it.each([
        ["fake", FakeProvisioner],
        ["management", Auth0ManagementProvisioner],
    ] as const)("provides the %s provisioner", async (provisioner, expected) => {
        @Global()
        @Module({ providers: [{ provide: CONSOLE_CONFIG, useValue: makeConfig("test", provisioner) }], exports: [CONSOLE_CONFIG] })
        class ConfigStubModule {}

        const moduleRef = await Test.createTestingModule({ imports: [ConfigStubModule, ProvisioningModule] }).compile();
        await moduleRef.init();
        expect(moduleRef.get(AUTH0_PROVISIONER)).toBeInstanceOf(expected);
        await moduleRef.close();
    });

    describe("health check", () => {
        let fake: FakeProvisioner;
        let gauge: Gauge<string>;

        const build = (env: ConfigEnv): ProvisioningModule => {
            const histogram = new Histogram({ name: "h", help: "h", labelNames: ["op", "outcome"], registers: [] });
            return new ProvisioningModule(makeConfig(env, "fake"), fake, new ProvisioningMetrics(histogram, gauge));
        };

        const up = async (): Promise<number | undefined> => (await gauge.get()).values[0]?.value;

        beforeEach(() => {
            jest.useFakeTimers();
            fake = new FakeProvisioner();
            gauge = new Gauge({ name: "g", help: "g", registers: [] });
        });

        afterEach(() => jest.useRealTimers());

        it("runs at bootstrap and every 10 minutes, and sets console_auth0_up", async () => {
            const module = build("staging");
            fake.script("checkHealth", "failed");
            module.onApplicationBootstrap();
            await jest.advanceTimersByTimeAsync(0);
            expect(await up()).toBe(0);

            await jest.advanceTimersByTimeAsync(HEALTH_CHECK_INTERVAL_MS);
            expect(await up()).toBe(1);
            expect(fake.calls.filter((call) => call.op === "checkHealth")).toHaveLength(2);

            module.onModuleDestroy();
            await jest.advanceTimersByTimeAsync(HEALTH_CHECK_INTERVAL_MS * 3);
            expect(fake.calls).toHaveLength(2);
        });

        it("does not run under CONFIG_ENV=test", async () => {
            const module = build("test");
            module.onApplicationBootstrap();
            await jest.advanceTimersByTimeAsync(HEALTH_CHECK_INTERVAL_MS * 2);
            expect(fake.calls).toHaveLength(0);
            module.onModuleDestroy();
        });
    });
});
