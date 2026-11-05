import configuration from "../../src/config";

const BASE_ENV: Record<string, string> = {
    CONFIG_ENV: "development",
    APP_PORT: "3000",
    PUBLIC_URL: "https://console.example.com/",
    AUTH0_LOGIN_DOMAIN: "login.testnet.fast-auth.com",
    AUTH0_CONSOLE_CLIENT_ID: "console-client",
    NEAR_NETWORK: "testnet",
    AUTH0_PROVISIONER: "fake",
    EMAIL_PROVIDER: "fake",
    ADMIN_EMAILS: " Admin@Example.com, ,ops@example.com ",
};

const MANAGEMENT_ENV: Record<string, string> = {
    AUTH0_PROVISIONER: "management",
    AUTH0_MGMT_DOMAIN: "tenant.eu.auth0.com",
    AUTH0_M2M_CLIENT_ID: "m2m-id",
    AUTH0_M2M_CLIENT_SECRET: "m2m-secret",
    AUTH0_TEMPLATE_CLIENT_ID: "template-client",
};

const SES_ENV: Record<string, string> = { EMAIL_PROVIDER: "ses", SES_FROM: "no-reply@auth.example.com", SES_REGION: "eu-west-1" };

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

        expect(config.server).toEqual({
            name: "console",
            port: 3000,
            publicUrl: "https://console.example.com",
            readyzTimeoutMs: 2000,
            shutdownDelayMs: 0,
            enableSwagger: true,
        });
        expect(config.auth0).toMatchObject({ jwksTimeoutMs: 6000, jwksRefetchCooldownMs: 30000, healthCheckIntervalMs: 600000 });
        expect(config.throttle).toEqual({ submitDappPerMinute: 5, editDappPerMinute: 10, adminMutationPerMinute: 60 });
        expect(config.autoApproval).toEqual({ dailyCap: 10 });
        expect(config.slack).toEqual({ webhookUrl: null, timeoutMs: 5000 });
        expect(config.logger).toEqual({ logLevel: "info", logFile: undefined });
    });

    it("should default the port to 3001 in development and 3000 elsewhere when APP_PORT is unset", () => {
        expect(load({ APP_PORT: undefined }).server.port).toBe(3001);
        expect(load({ APP_PORT: undefined, CONFIG_ENV: "staging" }).server.port).toBe(3000);
    });

    it("should lowercase, trim and drop empty admin emails", () => {
        expect(load().admin).toEqual({ emails: ["admin@example.com", "ops@example.com"] });
    });

    it("should log at warn under CONFIG_ENV=test unless LOG_LEVEL says otherwise", () => {
        expect(load({ CONFIG_ENV: "test" }).logger.logLevel).toBe("warn");
        expect(load({ CONFIG_ENV: "test", LOG_LEVEL: "debug" }).logger.logLevel).toBe("debug");
    });

    it("should read the Management API settings only for the management provisioner", () => {
        expect(load(MANAGEMENT_ENV).auth0).toMatchObject({
            provisioner: "management",
            management: {
                domain: "tenant.eu.auth0.com",
                m2mClientId: "m2m-id",
                m2mClientSecret: "m2m-secret",
                templateClientId: "template-client",
                retryAfterMs: 1000,
                maxRetryAfterMs: 10000,
                timeoutMs: 10000,
            },
        });
        expect(load({ AUTH0_MGMT_DOMAIN: "tenant.eu.auth0.com" }).auth0.management).toBeNull();
    });

    it("should accept production with the management provisioner and SES", () => {
        const config = load({ CONFIG_ENV: "production", ...MANAGEMENT_ENV, ...SES_ENV });

        expect(config.email).toEqual({
            provider: "ses",
            ses: { from: "no-reply@auth.example.com", region: "eu-west-1", timeoutMs: 10000, maxAttempts: 2 },
            guideUrl: "https://docs.auth.near.org/home/guides/authenticate-users",
        });
        expect(config.server.enableSwagger).toBe(false);
    });

    it.each<[string, Record<string, string | undefined>, string]>([
        ["an APP_PORT out of range", { APP_PORT: "70000" }, "port"],
        ["a PUBLIC_URL with a path", { PUBLIC_URL: "https://console.example.com/app" }, "publicUrl"],
        ["a PUBLIC_URL with credentials", { PUBLIC_URL: "https://user@console.example.com" }, "publicUrl"],
        ["an ftp PUBLIC_URL", { PUBLIC_URL: "ftp://console.example.com" }, "publicUrl"],
        ["a login domain with a scheme", { AUTH0_LOGIN_DOMAIN: "https://login.example.com" }, "loginDomain"],
        ["an unknown NEAR network", { NEAR_NETWORK: "devnet" }, "nearNetwork"],
        ["no admin email", { ADMIN_EMAILS: " , " }, "emails"],
        ["an http guide URL", { AUTHENTICATE_USERS_GUIDE_URL: "http://docs.example.com/guide" }, "guideUrl"],
        ["an invalid admin email", { ADMIN_EMAILS: "admin@example.com,not-an-email" }, "emails"],
        ["a non-numeric timeout", { READYZ_TIMEOUT_MS: "soon" }, "readyzTimeoutMs"],
        ["a zero daily cap", { AUTO_APPROVAL_DAILY_CAP: "0" }, "dailyCap"],
        ["a Slack URL outside hooks.slack.com", { SLACK_WEBHOOK_URL: "https://example.com/hook" }, "webhookUrl"],
        [
            "the management provisioner without its client secret",
            { ...MANAGEMENT_ENV, AUTH0_M2M_CLIENT_SECRET: undefined },
            "m2mClientSecret",
        ],
        ["SES without a sender", { ...SES_ENV, SES_FROM: undefined }, "from"],
        ["the fake provisioner in production", { CONFIG_ENV: "production", ...SES_ENV }, "provisioner"],
        ["the fake emailer in production", { CONFIG_ENV: "production", ...MANAGEMENT_ENV }, "provider"],
        ["an unknown log level", { LOG_LEVEL: "loud" }, "logLevel"],
    ])("should refuse %s, naming the setting", (_case, overrides, setting) => {
        expect(() => load(overrides)).toThrow(`Error validating config param ${setting} with value`);
    });
});
