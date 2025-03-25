export type ServerConfig = {
    port: number;
    enableSwagger: boolean;
    enableCors: boolean;
};

/**
 * Builds the server configuration.
 * @returns The server configuration.
 */
export default (): ServerConfig => {
    return {
        port: process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 3001,
        enableSwagger: true,
        enableCors: true,
    };
};
