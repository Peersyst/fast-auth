import serverConfig from "./server.config";
import loggerConfig from "./logger.config";
import auth0Config from "./auth0.config";
import brokerConfig from "./broker.config";

/**
 * Builds the application configuration, throwing on the first missing or malformed setting.
 * @returns The application configuration.
 */
export default () => ({
    server: serverConfig(),
    logger: loggerConfig(),
    auth0: auth0Config(),
    broker: brokerConfig(),
});
