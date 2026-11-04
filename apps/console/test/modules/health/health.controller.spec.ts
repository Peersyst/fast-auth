import { Test } from "@nestjs/testing";
import { CommonErrorCode } from "../../../src/modules/common/exception/common-error-codes";
import { ConsoleException } from "../../../src/modules/common/exception/console.exception";
import { HealthController } from "../../../src/modules/health/health.controller";
import { HealthService } from "../../../src/modules/health/health.service";

describe("HealthController", () => {
    const health = { checkReady: jest.fn<Promise<void>, []>() };

    let controller: HealthController;

    beforeEach(async () => {
        health.checkReady.mockReset();
        const module = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [{ provide: HealthService, useValue: health }],
        }).compile();
        controller = module.get(HealthController);
    });

    it("should answer ok on livez without checking readiness", async () => {
        await expect(controller.livez()).resolves.toEqual({ status: "ok" });
        expect(health.checkReady).not.toHaveBeenCalled();
    });

    it("should answer ok on readyz when the service finds the app ready", async () => {
        health.checkReady.mockResolvedValue(undefined);

        await expect(controller.readyz()).resolves.toEqual({ status: "ok" });
    });

    it("should answer 503 UNAVAILABLE on readyz when the service finds the app not ready", async () => {
        health.checkReady.mockRejectedValue(new ConsoleException(CommonErrorCode.UNAVAILABLE));

        await expect(controller.readyz()).rejects.toMatchObject({
            body: { statusCode: 503, code: "UNAVAILABLE", message: "Not ready. Try again later." },
        });
    });
});
