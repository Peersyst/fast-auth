import { buildConfig, validPort, validPublicUrl } from "@backend/config";

export interface ServerConfig {
    port: number;
    /** The broker's own origin. Auth0 sends users back to its /callback. */
    publicUrl: string;
}

/**
 * Builds the server configuration.
 * @returns The server configuration.
 */
export default (): ServerConfig => {
    return buildConfig<ServerConfig>(
        {
            port: 3000,
            publicUrl: {
                default: "https://sandbox.auth.near.org",
                development: "http://localhost:3000",
            },
        },
        { port: validPort, publicUrl: validPublicUrl },
    );
};
