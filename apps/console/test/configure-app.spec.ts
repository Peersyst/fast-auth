import { ConfigEnv } from "../src/config/console-config";
import { createLogFormat } from "../src/configure-app";

/**
 * Runs a log entry through a format the way a winston transport does.
 * @param env The environment the format is built for.
 * @param colors Whether the format colours its output.
 * @returns The line the transport would print.
 */
function render(env: ConfigEnv, colors: boolean): string {
    const info = createLogFormat(env, colors).transform({ level: "info", message: "Server started" }, {});
    return String((info as Record<symbol, unknown>)[Symbol.for("message")]);
}

describe("createLogFormat", () => {
    it.each([true, false])("should print JSON with the message, level and timestamp in production, colours %s", (colors) => {
        expect(JSON.parse(render(ConfigEnv.PRODUCTION, colors))).toEqual({
            level: "info",
            message: "Server started",
            timestamp: expect.any(String),
        });
    });

    it.each([ConfigEnv.DEVELOPMENT, ConfigEnv.TEST, ConfigEnv.STAGING])("should print a readable line in %s", (env) => {
        const line = render(env, false);

        expect(line).toContain("Server started");
        expect(() => JSON.parse(line)).toThrow();
    });
});
