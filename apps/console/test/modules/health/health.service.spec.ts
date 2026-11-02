import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import type { ConsoleConfig } from "../../../src/config/console-config";
import type { ConsoleException } from "../../../src/modules/common/exception/console.exception";
import { HealthService } from "../../../src/modules/health/health.service";
import { DataSourceMock } from "../../mocks";
import { TEST_CONFIG } from "../../utils/test-config";

describe("HealthService", () => {
    const dataSource = new DataSourceMock();

    let module: TestingModule;
    let service: HealthService;
    let warn: jest.SpyInstance;

    beforeAll(() => {
        warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    });

    afterAll(() => {
        warn.mockRestore();
    });

    /**
     * Builds the testing module around the service, with the database mocked and the server config overridden.
     * @param server The server config values to override.
     */
    async function createModule(server: Partial<ConsoleConfig["server"]> = {}): Promise<void> {
        module = await Test.createTestingModule({
            providers: [
                HealthService,
                { provide: DataSource, useValue: dataSource },
                { provide: ConfigService, useValue: new ConfigService({ ...TEST_CONFIG, server: { ...TEST_CONFIG.server, ...server } }) },
            ],
        }).compile();

        dataSource.clearMocks();
        warn.mockClear();
        service = module.get(HealthService);
    }

    beforeEach(async () => {
        await createModule();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe("checkReady", () => {
        it("should pass once the database answers SELECT 1, leaving no timer behind", async () => {
            jest.useFakeTimers();
            dataSource.query.mockResolvedValue([{ "?column?": 1 }]);

            await expect(service.checkReady()).resolves.toBeUndefined();
            expect(dataSource.query).toHaveBeenCalledWith("SELECT 1");
            expect(jest.getTimerCount()).toBe(0);
        });

        it("should throw 503 UNAVAILABLE and warn with the cause when the database refuses the query", async () => {
            dataSource.query.mockRejectedValue(new Error("connection refused"));

            await expect(service.checkReady()).rejects.toMatchObject({
                body: { statusCode: 503, code: "UNAVAILABLE", message: "Not ready. Try again later." },
            });
            expect(warn).toHaveBeenCalledWith("Not ready: connection refused");
        });

        it("should throw 503 UNAVAILABLE after 2 s when the database does not answer", async () => {
            jest.useFakeTimers();
            dataSource.query.mockReturnValue(new Promise(() => undefined));

            const ready = service.checkReady();
            const outcome = ready.then(
                () => "passed",
                (error: ConsoleException) => error.body.code,
            );
            await jest.advanceTimersByTimeAsync(1999);
            expect(jest.getTimerCount()).toBe(1);
            await jest.advanceTimersByTimeAsync(1);

            await expect(outcome).resolves.toBe("UNAVAILABLE");
            expect(warn).toHaveBeenCalledWith("Not ready: Database did not answer within 2000 ms");
        });
    });

    describe("shutdown", () => {
        beforeEach(async () => {
            await createModule({ shutdownDelayMs: 5000 });
        });

        it("should throw 503 UNAVAILABLE from the start of the shutdown and hold the shutdown until the delay has passed", async () => {
            jest.useFakeTimers();
            dataSource.query.mockResolvedValue([{ "?column?": 1 }]);
            await expect(service.checkReady()).resolves.toBeUndefined();

            let closed = false;
            const closing = module.close().then(() => {
                closed = true;
            });
            await jest.advanceTimersByTimeAsync(4999);

            await expect(service.checkReady()).rejects.toMatchObject({
                body: { statusCode: 503, code: "UNAVAILABLE", message: "Not ready. Try again later." },
            });
            expect(closed).toBe(false);

            await jest.advanceTimersByTimeAsync(1);
            await closing;

            expect(closed).toBe(true);
        });
    });
});
