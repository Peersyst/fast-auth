import { buildConfig, validPort, validPublicUrl } from "@backend/config";

export interface ServerConfig {
    name: string;
    port: number;
    /** The broker's own origin. Auth0 sends users back to its `/callback`, and dApps set it as their Auth0 domain. */
    publicUrl: string;
}

/**
 * Builds the server configuration.
 * @returns The server configuration.
 */
export default (): ServerConfig => {
    return buildConfig<ServerConfig>(
        {
            name: "sandbox-broker",
            port: process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 3000,
            publicUrl: process.env.PUBLIC_URL!,
        },
        {
            port: validPort,
            publicUrl: validPublicUrl,
        },
    );
};
