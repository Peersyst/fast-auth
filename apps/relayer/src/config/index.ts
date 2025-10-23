import serverConfig from "./server.config";
import loggerConfig from "./logger.config";
import { loadAwsSecrets } from "@backend/config";
import nearConfig from "./near.config";

/**
 * Builds the application configuration.
 * @returns The application configuration.
 */
export default async (): Promise<any> => {
    const secrets = await loadAwsSecrets(process.env.AWS_REGION!, process.env.AWS_SECRET_ID!);
    return {
        server: serverConfig(secrets),
        logger: loggerConfig(),
        near: nearConfig(secrets),
    };
};
