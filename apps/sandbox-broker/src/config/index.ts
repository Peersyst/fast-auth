import serverConfig from "./server.config";
import auth0Config from "./auth0.config";

/**
 * Builds the application configuration, throwing on the first missing or malformed setting.
 * @returns The application configuration.
 */
export default () => ({
    server: serverConfig(),
    auth0: auth0Config(),
});
