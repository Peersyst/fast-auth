import { ConfigManager } from "../../src/core/manager";
import { IConfigStorage } from "../../src/core/manager/interfaces";
import { Config } from "../../src/core/types";
import { createConfig } from "../../src/core/utils";
import { URLConfigProvider } from "../../src/providers/url-config.provider";

describe("URLConfigProvider", () => {
    const CONFIG_URL = "https://example.com/config.json";
    let fetchMock: jest.Mock;

    beforeEach(() => {
        fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ auth0Domain: "login.example.com" }) });
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    test("fetches the config past the HTTP cache", async () => {
        const config = await new URLConfigProvider(CONFIG_URL).fetchConfig();

        expect(config).toEqual({ auth0Domain: "login.example.com" });
        expect(fetchMock).toHaveBeenCalledWith(CONFIG_URL, { headers: { "Content-Type": "application/json" }, cache: "no-store" });
    });

    test("refuses a non-2xx answer even when its body is JSON", async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ statusCode: 503, message: "INTERNAL" }) });

        await expect(new URLConfigProvider(CONFIG_URL).fetchConfig()).rejects.toThrow("The config request failed with 503");
    });

    test("leaves a manager on its cached copy, without storing the error body, when the config answers non-2xx", async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ statusCode: 500, message: "INTERNAL" }) });
        const cached: Partial<Config> = { auth0Domain: "cached.example.com" };
        const storage: IConfigStorage<Config> = {
            get: jest.fn().mockResolvedValue(cached),
            set: jest.fn().mockResolvedValue(undefined),
            clear: jest.fn().mockResolvedValue(undefined),
        };

        const manager = new ConfigManager(new URLConfigProvider(CONFIG_URL), storage, createConfig({ projectName: "test" }));
        await manager.initialization;

        expect(manager.config.auth0Domain).toBe("cached.example.com");
        expect(storage.set).not.toHaveBeenCalled();
    });
});
