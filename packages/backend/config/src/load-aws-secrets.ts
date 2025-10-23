import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

export type AwsSecrets = Record<string, any>;

let loaded = false;

/**
 * Wait for the AWS secrets to be loaded.
 * @returns The loaded AWS secrets.
 */
export async function waitForAwsSecrets(): Promise<void> {
    while (!loaded) {
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
}

/**
 * Load the AWS secrets.
 * @param region The region.
 * @param SecretId The secret ID.
 * @returns The loaded AWS secrets.
 */
export async function loadAwsSecrets(region: string, SecretId: string): Promise<Record<string, string>> {
    try {
        const client = new SecretsManagerClient({ region: region });
        const secrets = await client.send(
            new GetSecretValueCommand({
                SecretId,
            }),
        );
        loaded = true;
        return JSON.parse(secrets.SecretString!);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log("Could not load config AWS secrets: " + e);
        loaded = true;
        return Promise.resolve({});
    }
}
