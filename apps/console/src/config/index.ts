import { z } from "zod";
import type { ConsoleConfig } from "./console-config";
import { Auth0ProvisionerName, ConfigEnv, EmailProviderName, LogLevel, NearNetwork } from "./console-config";

const text = z.string();
const port = z.coerce.number().int().min(1).max(65535);
const milliseconds = z.coerce.number().int().positive();
const count = z.coerce.number().int().positive();
const PUBLIC_URL_ERROR = "must be an http or https origin, with no path, query or fragment";
const publicUrl = z
    .url({ protocol: /^https?$/, error: PUBLIC_URL_ERROR, abort: true })
    .refine((url) => new URL(url).pathname === "/" && !/[?#@]/.test(url), PUBLIC_URL_ERROR)
    .transform((url) => url.replace(/\/+$/, ""));
const hostName = text.regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i, "must be a host name such as login.example.com, without scheme, port or path");

const managementProvisioner = z.object({
    AUTH0_PROVISIONER: z.literal(Auth0ProvisionerName.MANAGEMENT),
    AUTH0_MGMT_DOMAIN: hostName,
    AUTH0_M2M_CLIENT_ID: text,
    AUTH0_M2M_CLIENT_SECRET: text,
    AUTH0_TEMPLATE_CLIENT_ID: text,
    AUTH0_MGMT_RETRY_AFTER_MS: milliseconds.default(1000),
    AUTH0_MGMT_MAX_RETRY_AFTER_MS: milliseconds.default(10000),
    AUTH0_MGMT_TIMEOUT_MS: milliseconds.default(10000),
});
const fakeProvisioner = z.object({ AUTH0_PROVISIONER: z.literal(Auth0ProvisionerName.FAKE) });
const sesProvider = z.object({
    EMAIL_PROVIDER: z.literal(EmailProviderName.SES),
    SES_FROM: z.email(),
    SES_REGION: text,
    SES_TIMEOUT_MS: milliseconds.default(10000),
    SES_MAX_ATTEMPTS: count.default(2),
});
const fakeProvider = z.object({ EMAIL_PROVIDER: z.literal(EmailProviderName.FAKE) });

/**
 * Builds the environment schema, which allows the fake adapters only outside production.
 * @param raw The non-empty environment variables.
 * @returns The schema for those variables.
 */
function configSchema(raw: Record<string, string>) {
    const production = raw.CONFIG_ENV === ConfigEnv.PRODUCTION;
    const auth0Provisioner = production
        ? z.discriminatedUnion("AUTH0_PROVISIONER", [managementProvisioner], { error: "must be management when CONFIG_ENV=production" })
        : z.discriminatedUnion("AUTH0_PROVISIONER", [managementProvisioner, fakeProvisioner], {
              error: `must be one of ${Object.values(Auth0ProvisionerName).join(", ")}`,
          });
    const emailProvider = production
        ? z.discriminatedUnion("EMAIL_PROVIDER", [sesProvider], { error: "must be ses when CONFIG_ENV=production" })
        : z.discriminatedUnion("EMAIL_PROVIDER", [sesProvider, fakeProvider], {
              error: `must be one of ${Object.values(EmailProviderName).join(", ")}`,
          });

    return z
        .object({
            CONFIG_ENV: z.enum(ConfigEnv),
            APP_PORT: port,
            PUBLIC_URL: publicUrl,
            METRICS_PORT: port.default(9464),
            READYZ_TIMEOUT_MS: milliseconds.default(2000),
            SHUTDOWN_DELAY_MS: z.coerce.number().int().min(0).default(0),
            LOG_LEVEL: z.enum(LogLevel).optional(),
            LOG_FILE: text.optional(),
            DB_HOST: text,
            DB_PORT: port,
            DB_DATABASE: text,
            DB_USER: text,
            DB_PASSWORD: text,
            DB_POOL_SIZE: z.coerce
                .number()
                .int()
                .min(2, "must be at least 2: migrations hold a lock on one connection and run on another")
                .default(10),
            DB_SSL: z.enum(["true", "false"]).transform((ssl) => ssl === "true"),
            DB_CONNECT_TIMEOUT_MS: milliseconds.default(5000),
            DB_LOCK_TIMEOUT_MS: milliseconds.default(10000),
            AUTH0_LOGIN_DOMAIN: hostName,
            AUTH0_CONSOLE_CLIENT_ID: text,
            AUTH0_JWKS_TIMEOUT_MS: milliseconds.default(6000),
            AUTH0_JWKS_REFETCH_COOLDOWN_MS: milliseconds.default(30000),
            AUTH0_HEALTH_CHECK_INTERVAL_MS: milliseconds.default(600000),
            NEAR_NETWORK: z.enum(NearNetwork),
            ADMIN_EMAILS: text
                .transform((emails) =>
                    emails
                        .split(",")
                        .map((email) => email.trim().toLowerCase())
                        .filter((email) => email !== ""),
                )
                .pipe(z.array(z.email()).min(1)),
            THROTTLE_SUBMIT_DAPP_PER_MINUTE: count.default(5),
            THROTTLE_EDIT_DAPP_PER_MINUTE: count.default(10),
            THROTTLE_ADMIN_MUTATION_PER_MINUTE: count.default(60),
            SLACK_WEBHOOK_URL: z
                .url({ protocol: /^https$/, hostname: /^hooks\.slack\.com$/, error: "must be an https://hooks.slack.com/ webhook URL" })
                .optional(),
            SLACK_TIMEOUT_MS: milliseconds.default(5000),
        })
        .and(auth0Provisioner)
        .and(emailProvider);
}

/**
 * Validates the environment into typed config sections, throwing one error that names every bad key and no value.
 * @param env The environment to read.
 * @returns The validated config.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ConsoleConfig {
    const raw: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
        if (value !== undefined && value.trim() !== "") raw[key] = value;
    }

    const result = configSchema(raw).safeParse(raw);
    if (!result.success) {
        const problems = result.error.issues.map((issue) => {
            const key = issue.path.join(".");
            const missing = issue.path.length === 1 && raw[String(issue.path[0])] === undefined;
            return `${key}: ${missing ? "missing or empty" : issue.message}`;
        });
        throw new Error(`Invalid configuration:\n  ${problems.join("\n  ")}`);
    }

    const parsed = result.data;
    return {
        server: {
            env: parsed.CONFIG_ENV,
            port: parsed.APP_PORT,
            publicUrl: parsed.PUBLIC_URL,
            metricsPort: parsed.METRICS_PORT,
            readyzTimeoutMs: parsed.READYZ_TIMEOUT_MS,
            shutdownDelayMs: parsed.SHUTDOWN_DELAY_MS,
        },
        logger: {
            level: parsed.LOG_LEVEL ?? (parsed.CONFIG_ENV === ConfigEnv.TEST ? LogLevel.WARN : LogLevel.INFO),
            file: parsed.LOG_FILE ?? null,
        },
        database: {
            host: parsed.DB_HOST,
            port: parsed.DB_PORT,
            name: parsed.DB_DATABASE,
            user: parsed.DB_USER,
            password: parsed.DB_PASSWORD,
            poolSize: parsed.DB_POOL_SIZE,
            ssl: parsed.DB_SSL,
            connectTimeoutMs: parsed.DB_CONNECT_TIMEOUT_MS,
            lockTimeoutMs: parsed.DB_LOCK_TIMEOUT_MS,
        },
        auth0: {
            loginDomain: parsed.AUTH0_LOGIN_DOMAIN,
            consoleClientId: parsed.AUTH0_CONSOLE_CLIENT_ID,
            nearNetwork: parsed.NEAR_NETWORK,
            jwksTimeoutMs: parsed.AUTH0_JWKS_TIMEOUT_MS,
            jwksRefetchCooldownMs: parsed.AUTH0_JWKS_REFETCH_COOLDOWN_MS,
            healthCheckIntervalMs: parsed.AUTH0_HEALTH_CHECK_INTERVAL_MS,
            ...(parsed.AUTH0_PROVISIONER === Auth0ProvisionerName.MANAGEMENT
                ? {
                      provisioner: parsed.AUTH0_PROVISIONER,
                      mgmtDomain: parsed.AUTH0_MGMT_DOMAIN,
                      m2mClientId: parsed.AUTH0_M2M_CLIENT_ID,
                      m2mClientSecret: parsed.AUTH0_M2M_CLIENT_SECRET,
                      templateClientId: parsed.AUTH0_TEMPLATE_CLIENT_ID,
                      mgmtRetryAfterMs: parsed.AUTH0_MGMT_RETRY_AFTER_MS,
                      mgmtMaxRetryAfterMs: parsed.AUTH0_MGMT_MAX_RETRY_AFTER_MS,
                      mgmtTimeoutMs: parsed.AUTH0_MGMT_TIMEOUT_MS,
                  }
                : { provisioner: parsed.AUTH0_PROVISIONER }),
        },
        email:
            parsed.EMAIL_PROVIDER === EmailProviderName.SES
                ? {
                      provider: parsed.EMAIL_PROVIDER,
                      from: parsed.SES_FROM,
                      region: parsed.SES_REGION,
                      timeoutMs: parsed.SES_TIMEOUT_MS,
                      maxAttempts: parsed.SES_MAX_ATTEMPTS,
                  }
                : { provider: parsed.EMAIL_PROVIDER },
        admin: { emails: new Set(parsed.ADMIN_EMAILS) },
        throttle: {
            submitDappPerMinute: parsed.THROTTLE_SUBMIT_DAPP_PER_MINUTE,
            editDappPerMinute: parsed.THROTTLE_EDIT_DAPP_PER_MINUTE,
            adminMutationPerMinute: parsed.THROTTLE_ADMIN_MUTATION_PER_MINUTE,
        },
        slack: { webhookUrl: parsed.SLACK_WEBHOOK_URL ?? null, timeoutMs: parsed.SLACK_TIMEOUT_MS },
    };
}
