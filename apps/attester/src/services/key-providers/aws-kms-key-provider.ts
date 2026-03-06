import { KMSClient, GetPublicKeyCommand } from "@aws-sdk/client-kms";
import { PublicKey } from "../../types/attestation.types";
import { parseRsaPublicKeyFromDer } from "../../utils/rsa-public-key-from-der";
import { KeyProvider } from "./key-provider.interface";

export class AwsKmsKeyProvider implements KeyProvider {
    readonly name = "aws-kms";
    private readonly client: KMSClient;
    private readonly keyIds: string[];

    constructor(config: { region: string; previousKeyId?: string; currentKeyId?: string; nextKeyId?: string }) {
        this.client = new KMSClient({ region: config.region });
        this.keyIds = [config.previousKeyId, config.currentKeyId, config.nextKeyId].filter((id): id is string => !!id);
        if (this.keyIds.length === 0) {
            throw new Error("AwsKmsKeyProvider requires at least one configured KMS key id");
        }
    }

    /**
     * Returns the RSA public keys for all configured KMS key IDs.
     * @returns Array of public keys fetched from AWS KMS.
     */
    async getCurrentPublicKeys(): Promise<PublicKey[]> {
        return Promise.all(this.keyIds.map((keyId) => this.fetchPublicKey(keyId)));
    }

    /**
     * Fetches and parses the RSA public key for a given KMS key ID.
     * @param keyId The AWS KMS key ID to fetch the public key for.
     * @returns The parsed RSA public key.
     */
    private async fetchPublicKey(keyId: string): Promise<PublicKey> {
        const response = await this.client.send(new GetPublicKeyCommand({ KeyId: keyId }));
        if (!response.PublicKey) {
            throw new Error(`KMS returned no public key for ${keyId}`);
        }
        if (!response.KeySpec?.startsWith("RSA")) {
            throw new Error(`KMS key ${keyId} is not RSA (KeySpec: ${response.KeySpec})`);
        }
        return parseRsaPublicKeyFromDer(response.PublicKey);
    }
}
