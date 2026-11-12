import type { Config } from "@frontend/config";

/**
 * Loads the static config afresh with the given build variables.
 * @param env The build variables.
 * @returns The static config.
 */
async function loadWith(env: Record<string, string>): Promise<Config> {
    const previousEnv = process.env;
    process.env = { ...previousEnv, ...env };
    let config: Config | undefined;
    try {
        await jest.isolateModulesAsync(async () => {
            config = (await import("../../../../src/config/static")).default;
        });
    } finally {
        process.env = previousEnv;
    }
    return config!;
}

describe("static config", () => {
    it("should take the console API, Auth0 application and NEAR network from the build variables", async () => {
        const config = await loadWith({
            BACKEND_URL: "https://console-api.example.test",
            AUTH0_LOGIN_DOMAIN: "login.example.test",
            AUTH0_CLIENT_ID: "console-client-id",
            NEAR_NETWORK: "mainnet",
        });

        expect(config.backendUrl).toBe("https://console-api.example.test");
        expect(config.auth0Domain).toBe("login.example.test");
        expect(config.auth0ClientId).toBe("console-client-id");
        expect(config.nearNetwork).toBe("mainnet");
    });

    it("should call the console API on its own host on testnet without build variables", async () => {
        const config = await loadWith({ BACKEND_URL: "", AUTH0_LOGIN_DOMAIN: "", AUTH0_CLIENT_ID: "", NEAR_NETWORK: "" });

        expect(config.backendUrl).toBe("");
        expect(config.auth0Domain).toBe("");
        expect(config.auth0ClientId).toBe("");
        expect(config.nearNetwork).toBe("testnet");
    });
});
