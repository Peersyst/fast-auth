// Test settings for the integration suite, migration:check and spec. The shell's console config is cleared first, so an
// exported development .env can neither point these tools at a real database nor change a default the tests rely on.
const CONSOLE_CONFIG_PREFIXES = [
    "CONFIG_ENV",
    "APP_",
    "PUBLIC_URL",
    "METRICS_",
    "READYZ_",
    "SHUTDOWN_",
    "LOG_",
    "DB_",
    "AUTH0_",
    "NEAR_",
    "ADMIN_",
    "SLACK_",
    "EMAIL_",
    "SES_",
];
for (const key of Object.keys(process.env)) {
    if (CONSOLE_CONFIG_PREFIXES.some((prefix) => key.startsWith(prefix))) delete process.env[key];
}
Object.assign(process.env, {
    CONFIG_ENV: "test",
    APP_PORT: "3000",
    PUBLIC_URL: "http://localhost:3000",
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_DATABASE: "console_e2e",
    DB_USER: "console",
    DB_PASSWORD: "console",
    DB_POOL_SIZE: "10",
    DB_SSL: "false",
    AUTH0_LOGIN_DOMAIN: "login.console.test",
    AUTH0_CONSOLE_CLIENT_ID: "test-console-client-id",
    AUTH0_PROVISIONER: "fake",
    NEAR_NETWORK: "testnet",
    EMAIL_PROVIDER: "fake",
    ADMIN_EMAILS: "admin@console.test",
});
