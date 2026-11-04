import type { ConsoleConfig } from "../../src/config/console-config";
import { Auth0ProvisionerName, ConfigEnv, EmailProviderName, LogLevel, NearNetwork } from "../../src/config/console-config";

export const TEST_CONFIG: ConsoleConfig = {
    server: {
        env: ConfigEnv.TEST,
        port: 3000,
        publicUrl: "https://console.example.test",
        metricsPort: 9464,
        readyzTimeoutMs: 2000,
        shutdownDelayMs: 0,
    },
    logger: { level: LogLevel.WARN, file: null },
    database: {
        host: "localhost",
        port: 5432,
        name: "console",
        user: "console",
        password: "console",
        poolSize: 10,
        ssl: false,
        connectTimeoutMs: 5000,
        lockTimeoutMs: 10000,
    },
    auth0: {
        loginDomain: "login.example.test",
        consoleClientId: "console-client",
        provisioner: Auth0ProvisionerName.FAKE,
        nearNetwork: NearNetwork.TESTNET,
    },
    email: { provider: EmailProviderName.FAKE },
    admin: { emails: new Set(["admin@example.test"]) },
    slack: { webhookUrl: null },
};
