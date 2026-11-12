import type { Config } from "@frontend/config";

/**
 * Loads the static config afresh with the given /env.js value.
 * @param env The value /env.js sets, or undefined when it sets none.
 * @returns The static config.
 */
async function loadWith(env: { BACKEND_URL?: string } | undefined): Promise<Config> {
    Object.assign(globalThis, { __CONSOLE_ENV__: env });
    let config: Config | undefined;
    await jest.isolateModulesAsync(async () => {
        config = (await import("../../../../src/config/static")).default;
    });
    return config!;
}

describe("static config", () => {
    afterEach(() => {
        delete (globalThis as { __CONSOLE_ENV__?: unknown }).__CONSOLE_ENV__;
    });

    it("should call the console API at the BACKEND_URL the image serves", async () => {
        const config = await loadWith({ BACKEND_URL: "https://console-api.example.test" });

        expect(config.backendUrl).toBe("https://console-api.example.test");
        expect(config.configUrl).toBe("/config.json");
    });

    it.each([
        ["an empty BACKEND_URL", { BACKEND_URL: "" }],
        ["no /env.js value", undefined],
    ])("should call the console API on its own host with %s", async (_case, env) => {
        const config = await loadWith(env);

        expect(config.backendUrl).toBe("");
        expect(config.configUrl).toBe("/config.json");
    });
});
