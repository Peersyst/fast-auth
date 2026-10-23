import type { ConsoleConfig } from "../../src/config/console-config";

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
