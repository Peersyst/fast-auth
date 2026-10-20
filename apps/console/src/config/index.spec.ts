import { loadConfig } from "./index";

const VALID_ENV = {
    CONFIG_ENV: "test",
    APP_PORT: "3000",
    PUBLIC_URL: "https://console.example.com/",
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_NAME: "console",
    DB_USER: "console",
    DB_PASSWORD: "s3cret-password",
    DB_POOL_SIZE: "",
    DB_SSL: "false",
    DB_LOCK_TIMEOUT_MS: "",
    AUTH0_LOGIN_DOMAIN: "login.example.com",
    AUTH0_CONSOLE_CLIENT_ID: "console-client",
    AUTH0_MGMT_DOMAIN: "",
    AUTH0_M2M_CLIENT_ID: "",
    AUTH0_M2M_CLIENT_SECRET: "",
    AUTH0_TEMPLATE_CLIENT_ID: "",
    AUTH0_PROVISIONER: "fake",
    NEAR_NETWORK: "testnet",
    EMAIL_PROVIDER: "fake",
    SES_FROM: "",
    SES_REGION: "",
    ADMIN_EMAILS: " Alice@Example.com, bob@example.com ,",
    SLACK_WEBHOOK_URL: "",
};

const REAL_ADAPTERS = {
    AUTH0_PROVISIONER: "management",
    AUTH0_MGMT_DOMAIN: "tenant.auth0.com",
    AUTH0_M2M_CLIENT_ID: "m2m-client",
    AUTH0_M2M_CLIENT_SECRET: "m2m-secret-value",
    AUTH0_TEMPLATE_CLIENT_ID: "template-client",
    EMAIL_PROVIDER: "ses",
    SES_FROM: "no-reply@auth.near.org",
    SES_REGION: "us-east-1",
};

function loadError(env: NodeJS.ProcessEnv): string {
    try {
        loadConfig(env);
    } catch (error) {
        return (error as Error).message;
    }
    throw new Error("loadConfig did not throw");
}

describe("loadConfig", () => {
    it("parses a valid environment into typed sections", () => {
        const config = loadConfig(VALID_ENV);

        expect(config.server).toEqual({ env: "test", port: 3000, publicUrl: "https://console.example.com" });
        expect(config.database).toEqual({
            host: "localhost",
            port: 5432,
            name: "console",
            user: "console",
            password: "s3cret-password",
            poolSize: 10,
            ssl: false,
            lockTimeoutMs: 10000,
        });
        expect(config.auth0).toEqual({
            loginDomain: "login.example.com",
            consoleClientId: "console-client",
            nearNetwork: "testnet",
            provisioner: "fake",
        });
        expect(config.email).toEqual({ provider: "fake" });
        expect(config.slack).toEqual({ webhookUrl: null });
    });

    it("parses a set DB_LOCK_TIMEOUT_MS", () => {
        expect(loadConfig({ ...VALID_ENV, DB_LOCK_TIMEOUT_MS: "500" }).database.lockTimeoutMs).toBe(500);
    });

    it("refuses a DB_POOL_SIZE below 2, which the migration lock cannot run with", () => {
        expect(loadError({ ...VALID_ENV, DB_POOL_SIZE: "1" })).toContain(
            "DB_POOL_SIZE: must be at least 2: migrations hold a lock on one connection and run on another",
        );
        expect(loadConfig({ ...VALID_ENV, DB_POOL_SIZE: "2" }).database.poolSize).toBe(2);
    });

    it("lowercases and splits ADMIN_EMAILS", () => {
        expect([...loadConfig(VALID_ENV).admin.emails]).toEqual(["alice@example.com", "bob@example.com"]);
    });

    it("names every bad key and never a value", () => {
        const message = loadError({
            ...VALID_ENV,
            DB_HOST: "",
            DB_PORT: "not-a-port",
            NEAR_NETWORK: "betanet",
        });

        expect(message).toContain("DB_HOST: missing or empty");
        expect(message).toContain("DB_PORT:");
        expect(message).toContain("NEAR_NETWORK:");
        expect(message).not.toContain("not-a-port");
        expect(message).not.toContain("betanet");
    });

    it("treats a value of only spaces as missing", () => {
        expect(loadError({ ...VALID_ENV, AUTH0_CONSOLE_CLIENT_ID: "   " })).toContain("AUTH0_CONSOLE_CLIENT_ID: missing or empty");
    });

    it("requires the M2M and template keys only with the management provisioner", () => {
        const message = loadError({ ...VALID_ENV, AUTH0_PROVISIONER: "management" });

        for (const key of ["AUTH0_MGMT_DOMAIN", "AUTH0_M2M_CLIENT_ID", "AUTH0_M2M_CLIENT_SECRET", "AUTH0_TEMPLATE_CLIENT_ID"]) {
            expect(message).toContain(`${key}: missing or empty`);
        }
        expect(message).not.toContain("SES_");
    });

    it("requires the SES keys only with the ses email provider", () => {
        const message = loadError({ ...VALID_ENV, EMAIL_PROVIDER: "ses" });

        expect(message).toContain("SES_FROM: missing or empty");
        expect(message).toContain("SES_REGION: missing or empty");
        expect(message).not.toContain("AUTH0_");
    });

    it("refuses fake adapters in production", () => {
        const message = loadError({ ...VALID_ENV, CONFIG_ENV: "production" });

        expect(message).toContain("AUTH0_PROVISIONER: must be management when CONFIG_ENV=production");
        expect(message).toContain("EMAIL_PROVIDER: must be ses when CONFIG_ENV=production");
    });

    it("accepts the real adapters in production", () => {
        const config = loadConfig({ ...VALID_ENV, ...REAL_ADAPTERS, CONFIG_ENV: "production" });

        expect(config.auth0).toMatchObject({
            provisioner: "management",
            m2mClientSecret: "m2m-secret-value",
            mgmtDomain: "tenant.auth0.com",
        });
        expect(config.email).toEqual({ provider: "ses", from: "no-reply@auth.near.org", region: "us-east-1" });
    });

    it("accepts an http origin with a port for PUBLIC_URL", () => {
        expect(loadConfig({ ...VALID_ENV, PUBLIC_URL: "http://localhost:3000" }).server.publicUrl).toBe("http://localhost:3000");
    });

    it.each([
        ["a scheme-less host", "console.near.org"],
        ["a scheme-less host and port", "localhost:3000"],
        ["a non-http scheme", "ftp://console.example.com"],
        ["a script URL", "javascript:alert(1)"],
        ["a path", "https://console.example.com/console"],
        ["a query", "https://console.example.com?x=1"],
        ["a fragment", "https://console.example.com/#top"],
        ["credentials", "https://user:pass@console.example.com"],
        ["empty credentials", "https://@console.example.com"],
    ])("refuses a PUBLIC_URL with %s, naming the key", (_shape, url) => {
        expect(loadError({ ...VALID_ENV, PUBLIC_URL: url })).toContain("PUBLIC_URL: must be an http or https origin");
    });

    it("accepts a Slack incoming webhook and refuses any other URL without echoing it", () => {
        const webhookUrl = "https://hooks.slack.com/services/T000/B000/s3cret-token";
        expect(loadConfig({ ...VALID_ENV, SLACK_WEBHOOK_URL: webhookUrl }).slack).toEqual({ webhookUrl });

        for (const url of ["http://hooks.slack.com/services/T000/B000/s3cret-token", "https://example.com/s3cret-token"]) {
            const message = loadError({ ...VALID_ENV, SLACK_WEBHOOK_URL: url });
            expect(message).toContain("SLACK_WEBHOOK_URL: must be an https://hooks.slack.com/ webhook URL");
            expect(message).not.toContain("s3cret-token");
        }
    });

    it("rejects a login domain with a scheme and an invalid admin email", () => {
        const message = loadError({ ...VALID_ENV, AUTH0_LOGIN_DOMAIN: "https://login.example.com", ADMIN_EMAILS: "alice@example.com,bob" });

        expect(message).toContain("AUTH0_LOGIN_DOMAIN: must be a host name");
        expect(message).toContain("ADMIN_EMAILS.1:");
    });
});
