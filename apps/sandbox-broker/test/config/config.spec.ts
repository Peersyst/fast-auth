import configuration from "../../src/config";

const BASE_ENV: Record<string, string> = {
    CONFIG_ENV: "test",
    PUBLIC_URL: "https://sandbox.example",
    AUTH0_DOMAIN: "login.testnet.fast-auth.com",
    AUTH0_CLIENT_ID: "broker-client",
    AUTH0_CLIENT_SECRET: "broker-secret",
};

describe("configuration", () => {
    const originalEnv = process.env;

    /**
     * Builds the configuration from the base environment plus overrides.
     * @param overrides The variables to set, or to unset with undefined.
     * @returns The configuration.
     */
    const load = (overrides: Record<string, string | undefined> = {}) => {
        process.env = { ...BASE_ENV, ...overrides } as NodeJS.ProcessEnv;
        return configuration();
    };

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should read the defaults for every optional setting", () => {
        const config = load();

        expect(config.server).toEqual({ name: "sandbox-broker", port: 3000, publicUrl: "https://sandbox.example" });
        expect(config.auth0).toEqual({
            domain: "login.testnet.fast-auth.com",
            clientId: "broker-client",
            clientSecret: "broker-secret",
            timeoutMs: 10000,
        });
        expect(config.broker).toEqual({ flowTtlMs: 600000, codeTtlMs: 60000, maxPending: 10000 });
    });

    it("should refuse the production tenant", () => {
        expect(() => load({ AUTH0_DOMAIN: "login.auth.near.org" })).toThrow("domain");
    });

    it.each(["PUBLIC_URL", "AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET"])("should require %s", (name) => {
        expect(() => load({ [name]: undefined })).toThrow();
    });

    it.each(["https://sandbox.example/", "https://sandbox.example/path", "sandbox.example"])(
        "should refuse %s as the public URL",
        (publicUrl) => {
            expect(() => load({ PUBLIC_URL: publicUrl })).toThrow("publicUrl");
        },
    );
});
