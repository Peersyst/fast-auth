import firebaseConfig, { FirebaseConfig } from "./firebase.config";
import googleConfig, { GoogleConfig } from "./google.config";
import loggerConfig, { LoggerConfig } from "./logger.config";
import serverConfig, { ServerConfig } from "./server.config";

export type Config = {
    server: ServerConfig;
    logger: LoggerConfig;
    google: GoogleConfig;
    firebase: FirebaseConfig;
};

/**
 * Get the configuration for the application.
 * @returns The configuration for the application.
 */
export default async (): Promise<Config> => {
    return {
        server: serverConfig(),
        logger: loggerConfig(),
        google: googleConfig(),
        firebase: firebaseConfig(),
    };
};
