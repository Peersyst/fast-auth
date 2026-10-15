import { z } from "zod";
import type { ConsoleConfig } from "./console-config";
import { AUTH0_PROVISIONERS, ConfigEnv, EMAIL_PROVIDERS, NEAR_NETWORKS } from "./console-config";

const text = z.string();
const port = z.coerce.number().int().min(1).max(65535);
const PUBLIC_URL_ERROR = "must be an http or https origin, with no path, query or fragment";
const publicUrl = z
    .url({ protocol: /^https?$/, error: PUBLIC_URL_ERROR, abort: true })
    .refine((url) => new URL(url).pathname === "/" && !/[?#]/.test(url), PUBLIC_URL_ERROR)
    .transform((url) => url.replace(/\/+$/, ""));
const hostName = text.regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i, "must be a host name, without scheme or path");

const managementProvisioner = z.object({
    AUTH0_PROVISIONER: z.literal("management"),
    AUTH0_MGMT_DOMAIN: hostName,
    AUTH0_M2M_CLIENT_ID: text,
    AUTH0_M2M_CLIENT_SECRET: text,
    AUTH0_TEMPLATE_CLIENT_ID: text,
});
const fakeProvisioner = z.object({ AUTH0_PROVISIONER: z.literal("fake") });
const sesProvider = z.object({ EMAIL_PROVIDER: z.literal("ses"), SES_FROM: z.email(), SES_REGION: text });
const fakeProvider = z.object({ EMAIL_PROVIDER: z.literal("fake") });

function configSchema(raw: Record<string, string>) {
    const production = raw.CONFIG_ENV === ConfigEnv.Production;
    const auth0Provisioner = production
        ? z.discriminatedUnion("AUTH0_PROVISIONER", [managementProvisioner], { error: "must be management when CONFIG_ENV=production" })
        : z.discriminatedUnion("AUTH0_PROVISIONER", [managementProvisioner, fakeProvisioner], {
              error: `must be one of ${AUTH0_PROVISIONERS.join(", ")}`,
          });
    const emailProvider = production
        ? z.discriminatedUnion("EMAIL_PROVIDER", [sesProvider], { error: "must be ses when CONFIG_ENV=production" })
        : z.discriminatedUnion("EMAIL_PROVIDER", [sesProvider, fakeProvider], { error: `must be one of ${EMAIL_PROVIDERS.join(", ")}` });

    return z
        .object({
            CONFIG_ENV: z.enum(Object.values(ConfigEnv)),
            APP_PORT: port,
            PUBLIC_URL: publicUrl,
            DB_HOST: text,
            DB_PORT: port,
            DB_NAME: text,
            DB_USER: text,
            DB_PASSWORD: text,
            DB_POOL_SIZE: z.coerce
                .number()
                .int()
                .min(2, "must be at least 2: migrations hold a lock on one connection and run on another")
                .default(10),
            DB_SSL: z.enum(["true", "false"]).transform((ssl) => ssl === "true"),
            DB_LOCK_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
            AUTH0_LOGIN_DOMAIN: hostName,
            AUTH0_CONSOLE_CLIENT_ID: text,
            NEAR_NETWORK: z.enum(NEAR_NETWORKS),
            ADMIN_EMAILS: text
                .transform((emails) =>
                    emails
                        .split(",")
                        .map((email) => email.trim().toLowerCase())
                        .filter((email) => email !== ""),
                )
                .pipe(z.array(z.email()).min(1)),
            SLACK_WEBHOOK_URL: z
                .url({ protocol: /^https$/, hostname: /^hooks\.slack\.com$/, error: "must be an https://hooks.slack.com/ webhook URL" })
                .optional(),
        })
        .and(auth0Provisioner)
        .and(emailProvider);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ConsoleConfig {
    const raw: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
        if (value !== undefined && value !== "") raw[key] = value;
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
        server: { env: parsed.CONFIG_ENV, port: parsed.APP_PORT, publicUrl: parsed.PUBLIC_URL },
        database: {
            host: parsed.DB_HOST,
            port: parsed.DB_PORT,
            name: parsed.DB_NAME,
            user: parsed.DB_USER,
            password: parsed.DB_PASSWORD,
            poolSize: parsed.DB_POOL_SIZE,
            ssl: parsed.DB_SSL,
            lockTimeoutMs: parsed.DB_LOCK_TIMEOUT_MS,
        },
        auth0: {
            loginDomain: parsed.AUTH0_LOGIN_DOMAIN,
            consoleClientId: parsed.AUTH0_CONSOLE_CLIENT_ID,
            nearNetwork: parsed.NEAR_NETWORK,
            ...(parsed.AUTH0_PROVISIONER === "management"
                ? {
                      provisioner: parsed.AUTH0_PROVISIONER,
                      mgmtDomain: parsed.AUTH0_MGMT_DOMAIN,
                      m2mClientId: parsed.AUTH0_M2M_CLIENT_ID,
                      m2mClientSecret: parsed.AUTH0_M2M_CLIENT_SECRET,
                      templateClientId: parsed.AUTH0_TEMPLATE_CLIENT_ID,
                  }
                : { provisioner: parsed.AUTH0_PROVISIONER }),
        },
        email:
            parsed.EMAIL_PROVIDER === "ses"
                ? { provider: parsed.EMAIL_PROVIDER, from: parsed.SES_FROM, region: parsed.SES_REGION }
                : { provider: parsed.EMAIL_PROVIDER },
        admin: { emails: new Set(parsed.ADMIN_EMAILS) },
        slack: { webhookUrl: parsed.SLACK_WEBHOOK_URL ?? null },
    };
}
