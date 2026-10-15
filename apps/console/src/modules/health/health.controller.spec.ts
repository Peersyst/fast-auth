import type { DataSource } from "typeorm";
import { HealthController } from "./health.controller";

describe("HealthController.readyz", () => {
    const query = jest.fn();
    const controller = new HealthController({ query } as unknown as DataSource);

    afterEach(() => {
        jest.useRealTimers();
        query.mockReset();
    });

    it("answers ok once the database answers SELECT 1, leaving no timer behind", async () => {
        jest.useFakeTimers();
        query.mockResolvedValue([{ "?column?": 1 }]);

        await expect(controller.readyz()).resolves.toEqual({ status: "ok" });
        expect(query).toHaveBeenCalledWith("SELECT 1");
        expect(jest.getTimerCount()).toBe(0);
    });

    it("fails when the database refuses the query", async () => {
        query.mockRejectedValue(new Error("connection refused"));

        await expect(controller.readyz()).rejects.toThrow("connection refused");
    });

    it("fails after 2 s when the database does not answer", async () => {
        jest.useFakeTimers();
        query.mockReturnValue(new Promise(() => undefined));

        const ready = controller.readyz();
        const outcome = ready.then(
            () => "answered",
            (error: Error) => error.message,
        );
        await jest.advanceTimersByTimeAsync(1999);
        expect(jest.getTimerCount()).toBe(1);
        await jest.advanceTimersByTimeAsync(1);

        await expect(outcome).resolves.toBe("Database did not answer within 2000 ms");
    });
});
