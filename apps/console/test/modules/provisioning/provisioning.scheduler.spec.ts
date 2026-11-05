import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { Test } from "@nestjs/testing";
import { register } from "prom-client";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/provisioning.tokens";
import { ProvisioningModule } from "../../../src/modules/provisioning/provisioning.module";
import { ProvisioningScheduler } from "../../../src/modules/provisioning/provisioning.scheduler";
import { configStubModule, createConfigServiceMock } from "../../mocks/config/config.mock";
import { FakeProvisionerMock } from "../../mocks/provisioning/fake-provisioner.mock";

describe("ProvisioningScheduler", () => {
    let scheduler: ProvisioningScheduler;
    let provisioner: FakeProvisionerMock;
    let schedulerRegistry: SchedulerRegistry;

    /**
     * Reads the console_auth0_up gauge.
     * @returns The gauge value.
     */
    const auth0Up = async (): Promise<number | undefined> => (await register.getSingleMetric("console_auth0_up")!.get()).values[0]?.value;

    /**
     * Builds the scheduler for an environment.
     * @param env The CONFIG_ENV.
     */
    const build = async (env: string): Promise<void> => {
        process.env.CONFIG_ENV = env;
        const configService = createConfigServiceMock();
        provisioner = new FakeProvisionerMock();
        const module = await Test.createTestingModule({
            imports: [configStubModule(configService), ScheduleModule.forRoot(), ProvisioningModule],
        })
            .overrideProvider(AUTH0_PROVISIONER)
            .useValue(provisioner)
            .compile();
        schedulerRegistry = module.get(SchedulerRegistry);
        scheduler = module.get(ProvisioningScheduler);
    };

    afterEach(() => {
        delete process.env.CONFIG_ENV;
        schedulerRegistry.getIntervals().forEach((name) => schedulerRegistry.deleteInterval(name));
        register.resetMetrics();
    });

    it("should set console_auth0_up to 1 after a passing check and 0 after a failing one", async () => {
        await build("test");

        await scheduler.checkHealth();
        expect(await auth0Up()).toBe(1);

        provisioner.script("checkHealth", "failed");
        await scheduler.checkHealth();
        expect(await auth0Up()).toBe(0);
    });

    it("should check on start and register the interval outside CONFIG_ENV=test", async () => {
        await build("staging");

        scheduler.onApplicationBootstrap();
        await new Promise(setImmediate);

        expect(provisioner.calls).toEqual([{ op: "checkHealth" }]);
        expect(schedulerRegistry.getIntervals()).toEqual(["auth0-health-check"]);
    });

    it("should not check under CONFIG_ENV=test", async () => {
        await build("test");

        scheduler.onApplicationBootstrap();

        expect(provisioner.calls).toEqual([]);
        expect(schedulerRegistry.getIntervals()).toEqual([]);
    });
});
