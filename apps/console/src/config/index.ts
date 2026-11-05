import serverConfig from "./server.config";
import loggerConfig from "./logger.config";
import { getNestTypeORMConfig } from "./typeorm.config";
import auth0Config from "./auth0.config";
import emailConfig from "./email.config";
import adminConfig from "./admin.config";
import throttleConfig from "./throttle.config";
import autoApprovalConfig from "./auto-approval.config";
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
    email: emailConfig(),
    admin: adminConfig(),
    throttle: throttleConfig(),
    autoApproval: autoApprovalConfig(),
    slack: slackConfig(),
});
