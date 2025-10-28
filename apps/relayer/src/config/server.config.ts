import { buildConfig, validPort } from "@backend/config";

interface ServerConfig {
    name: string;
    port: number;
    enableSwagger: boolean;
    enableCors: boolean;
}

/**
 * Builds the server configuration.
 * @returns The server configuration.
 */
export default (): ServerConfig => {
    return buildConfig<ServerConfig>(
        {
            name: "fast-auth-relayer",
            port: process.env.APP_PORT
                ? parseInt(process.env.APP_PORT)
                : {
                      default: 3001,
                      development: 3001,
                  },
            enableSwagger: {
                default: true,
                production: false,
            },
            enableCors: {
                default: true,
                production: false,
            },
        },
        {
            port: validPort,
        },
    );
};
