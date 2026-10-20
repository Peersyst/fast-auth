import { Logger } from "@nestjs/common";
import type { DataSource } from "typeorm";
import type { ConsoleException } from "../common/exception/console.exception";
import { HealthController } from "./health.controller";

describe("HealthController.readyz", () => {
    const query = jest.fn();
    const controller = new HealthController({ query } as unknown as DataSource);

    let warn: jest.SpyInstance;

    beforeAll(() => {
        warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    });

    afterAll(() => {
        warn.mockRestore();
    });

    afterEach(() => {
        jest.useRealTimers();
        query.mockReset();
        warn.mockClear();
    });

    it("answers ok once the database answers SELECT 1, leaving no timer behind", async () => {
        jest.useFakeTimers();
        query.mockResolvedValue([{ "?column?": 1 }]);

        await expect(controller.readyz()).resolves.toEqual({ status: "ok" });
        expect(query).toHaveBeenCalledWith("SELECT 1");
        expect(jest.getTimerCount()).toBe(0);
    });

    it("answers 503 UNAVAILABLE and warns with the cause when the database refuses the query", async () => {
        query.mockRejectedValue(new Error("connection refused"));

        await expect(controller.readyz()).rejects.toMatchObject({
            body: { statusCode: 503, code: "UNAVAILABLE", message: "Not ready. Try again later." },
        });
        expect(warn).toHaveBeenCalledWith("Not ready: connection refused");
    });

    it("answers 503 UNAVAILABLE after 2 s when the database does not answer", async () => {
        jest.useFakeTimers();
        query.mockReturnValue(new Promise(() => undefined));

        const ready = controller.readyz();
        const outcome = ready.then(
            () => "answered",
            (error: ConsoleException) => error.body.code,
        );
        await jest.advanceTimersByTimeAsync(1999);
        expect(jest.getTimerCount()).toBe(1);
        await jest.advanceTimersByTimeAsync(1);

        await expect(outcome).resolves.toBe("UNAVAILABLE");
        expect(warn).toHaveBeenCalledWith("Not ready: Database did not answer within 2000 ms");
    });
});
