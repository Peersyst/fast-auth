import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { Gauge, Histogram } from "prom-client";
import { TEST_CONFIG } from "../../utils/test-config";
import { ConfigEnv } from "../../../src/config/console-config";
import type { ConsoleConfig } from "../../../src/config/console-config";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/auth0-provisioner";
import { FakeProvisioner } from "../../../src/modules/provisioning/fake.provisioner";
import { ProvisioningMetrics } from "../../../src/modules/provisioning/provisioning.metrics";
import { ProvisioningScheduler } from "../../../src/modules/provisioning/provisioning.scheduler";

const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * Builds the test config for an environment.
 * @param env The environment.
 * @returns The config.
 */
const makeConfig = (env: ConfigEnv): ConsoleConfig => ({ ...TEST_CONFIG, server: { ...TEST_CONFIG.server, env } });

describe("ProvisioningScheduler", () => {
    let fake: FakeProvisioner;
    let gauge: Gauge<string>;

    const build = async (env: ConfigEnv): Promise<ProvisioningScheduler> => {
        const histogram = new Histogram({ name: "h", help: "h", labelNames: ["op", "outcome"], registers: [] });
        const moduleRef = await Test.createTestingModule({
            providers: [
                ProvisioningScheduler,
                { provide: ConfigService, useValue: new ConfigService(makeConfig(env)) },
                { provide: AUTH0_PROVISIONER, useValue: fake },
                { provide: ProvisioningMetrics, useValue: new ProvisioningMetrics(histogram, gauge) },
            ],
        }).compile();
        return moduleRef.get(ProvisioningScheduler);
    };

    const up = async (): Promise<number | undefined> => (await gauge.get()).values[0]?.value;

    beforeEach(() => {
        jest.useFakeTimers();
        fake = new FakeProvisioner();
        gauge = new Gauge({ name: "g", help: "g", registers: [] });
    });

    afterEach(() => jest.useRealTimers());

    it("should run at bootstrap and every 10 minutes, and set console_auth0_up", async () => {
        const scheduler = await build(ConfigEnv.STAGING);
        fake.script("checkHealth", "failed");
        scheduler.onApplicationBootstrap();
        await jest.advanceTimersByTimeAsync(0);
        expect(await up()).toBe(0);

        await jest.advanceTimersByTimeAsync(TEN_MINUTES_MS);
        expect(await up()).toBe(1);
        expect(fake.calls.filter((call) => call.op === "checkHealth")).toHaveLength(2);

        scheduler.onModuleDestroy();
        await jest.advanceTimersByTimeAsync(TEN_MINUTES_MS * 3);
        expect(fake.calls).toHaveLength(2);
    });

    it("should not run under CONFIG_ENV=test", async () => {
        const scheduler = await build(ConfigEnv.TEST);
        scheduler.onApplicationBootstrap();
        await jest.advanceTimersByTimeAsync(TEN_MINUTES_MS * 2);
        expect(fake.calls).toHaveLength(0);
        scheduler.onModuleDestroy();
    });
});
