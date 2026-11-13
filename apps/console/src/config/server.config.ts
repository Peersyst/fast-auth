import { buildConfig, validPort, validPositiveInt, validPublicUrl } from "@backend/config";

export interface ServerConfig {
    name: string;
    port: number;
    /** The web app's public URL, which links in Slack alerts point to. */
    publicUrl: string;
    readyzTimeoutMs: number;
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
            publicUrl: process.env.PUBLIC_URL || "",
            readyzTimeoutMs: process.env.READYZ_TIMEOUT_MS ? parseInt(process.env.READYZ_TIMEOUT_MS) : 2000,
            enableSwagger: {
                default: true,
                production: false,
            },
        },
        {
            port: validPort,
            publicUrl: validPublicUrl,
            readyzTimeoutMs: validPositiveInt,
        },
    );
};
