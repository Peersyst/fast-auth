import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { main } from "./index";
import { LoggerService } from "./services/logger.service";

let cachedSecrets: Record<string, string> | null = null;
const secretsManagerClient = new SecretsManagerClient({});
const logger = new LoggerService();

/**
 * Lambda handler for the attester function.
 * @param event The event payload from EventBridge.
 */
export const handler = async (event: any) => {
    const replicaIndex = event.replicaIndex ?? 0;

    // In Lambda, ENVIRONMENT should be set, e.g., 'staging' or 'production'
    const envName = process.env.ENVIRONMENT || "staging";
    const secretId = `fast-auth/${envName}/attester-${replicaIndex}`;

    if (!cachedSecrets) {
        logger.log("handler", `Fetching secrets from ${secretId}...`);
        try {
            const command = new GetSecretValueCommand({ SecretId: secretId });
            const response = await secretsManagerClient.send(command);

            if (response.SecretString) {
                cachedSecrets = JSON.parse(response.SecretString);
                logger.log("handler", "Secrets fetched and cached successfully.");
            } else {
                throw new Error(`SecretString is missing in the response for ${secretId}`);
            }
        } catch (error) {
            logger.error("handler", `Error fetching secret ${secretId}: ${error instanceof Error ? error.message : "Unknown error"}`);
            throw error;
        }
    } else {
        logger.log("handler", "Using cached secrets.");
    }

    // Populate process.env so that index.ts can read the config as usual
    if (cachedSecrets) {
        Object.assign(process.env, cachedSecrets);
    }

    // Invoke the original main logic
    await main();
};
