import type { ConsoleConfig, ManagementAuth0Config, SesEmailConfig } from "../../src/config/console-config";

export const TEST_CONFIG: ConsoleConfig = {
    server: { env: "test", port: 3000, publicUrl: "https://console.example.test" },
    database: {
        host: "localhost",
        port: 5432,
        name: "console",
        user: "console",
        password: "console",
        poolSize: 10,
        ssl: false,
        lockTimeoutMs: 10000,
    },
    auth0: {
        loginDomain: "login.example.test",
        consoleClientId: "console-client",
        provisioner: "fake",
        nearNetwork: "testnet",
    },
    email: { provider: "fake" },
    admin: { emails: new Set(["admin@example.test"]) },
    slack: { webhookUrl: null },
};

export const MANAGEMENT_AUTH0: ManagementAuth0Config = {
    ...TEST_CONFIG.auth0,
    provisioner: "management",
    mgmtDomain: "tenant.eu.auth0.com",
    m2mClientId: "m2m-id",
    m2mClientSecret: "m2m-secret",
    templateClientId: "template-client",
};

export const SES_EMAIL: SesEmailConfig = { provider: "ses", from: "no-reply@auth.example.test", region: "eu-west-1" };
