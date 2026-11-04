import { runScript } from "../../src/scripts/run-script";

describe("runScript", () => {
    let stderr: jest.SpyInstance;
    let exit: jest.SpyInstance;

    beforeEach(() => {
        stderr = jest.spyOn(process.stderr, "write").mockReturnValue(true);
        exit = jest.spyOn(process, "exit").mockReturnValue(undefined as never);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const failWith = async (error: unknown, exitCode?: number): Promise<void> => {
        runScript("anonymise", () => Promise.reject(error), exitCode);
        await new Promise(setImmediate);
    };

    it("should name the errno of a refused database connection, whose AggregateError has no message", async () => {
        await failWith(Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" }));

        expect(stderr.mock.calls).toEqual([["anonymise failed: ECONNREFUSED\n"]]);
        expect(exit.mock.calls).toEqual([[1]]);
    });

    it("should print the message of an ordinary error", async () => {
        await failWith(new Error('password authentication failed for user "console"'));

        expect(stderr.mock.calls).toEqual([['anonymise failed: password authentication failed for user "console"\n']]);
    });

    it("should exit with the given failure code", async () => {
        await failWith(new Error("boom"), 2);

        expect(exit.mock.calls).toEqual([[2]]);
    });
});
