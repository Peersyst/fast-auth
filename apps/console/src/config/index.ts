import serverConfig from "./server.config";
import loggerConfig from "./logger.config";
import { getNestTypeORMConfig } from "./typeorm.config";
import auth0Config from "./auth0.config";
import adminConfig from "./admin.config";
import slackConfig from "./slack.config";

/**
 * Builds the application configuration, throwing on the first missing or malformed setting.
 * @returns The application configuration.
 */
export default () => ({
    server: serverConfig(),
    logger: loggerConfig(),
    database: getNestTypeORMConfig(),
    auth0: auth0Config(),
    admin: adminConfig(),
    slack: slackConfig(),
});
