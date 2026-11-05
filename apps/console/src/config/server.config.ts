import { buildConfig, validPort, validPositiveInt, validPublicUrl } from "@backend/config";

export interface ServerConfig {
    name: string;
    port: number;
    /** The web app's public URL, which links in emails and Slack alerts point to. */
    publicUrl: string;
    readyzTimeoutMs: number;
    /** How long /readyz answers 503 on shutdown before the server closes, so the load balancer stops routing first. */
    shutdownDelayMs: number;
    enableSwagger: boolean;
}

/**
 * Builds the server configuration.
 * @returns The server configuration.
 */
export default (): ServerConfig => {
    return buildConfig<ServerConfig>(
        {
            name: "console",
            port: process.env.APP_PORT
                ? parseInt(process.env.APP_PORT)
                : {
                      default: 3000,
                      development: 3001,
                  },
            publicUrl: (process.env.PUBLIC_URL ?? "").replace(/\/+$/, ""),
            readyzTimeoutMs: process.env.READYZ_TIMEOUT_MS ? parseInt(process.env.READYZ_TIMEOUT_MS) : 2000,
            shutdownDelayMs: process.env.SHUTDOWN_DELAY_MS ? parseInt(process.env.SHUTDOWN_DELAY_MS) : 0,
            enableSwagger: {
                default: true,
                production: false,
            },
        },
        {
            port: validPort,
            publicUrl: validPublicUrl,
            readyzTimeoutMs: validPositiveInt,
            shutdownDelayMs: (ms: number) => Number.isInteger(ms) && ms >= 0,
        },
    );
};
