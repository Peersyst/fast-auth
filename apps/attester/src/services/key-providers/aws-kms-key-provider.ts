import { KMSClient, GetPublicKeyCommand } from "@aws-sdk/client-kms";
import { PublicKey } from "../../types/attestation.types";
import { parseRsaPublicKeyFromDer } from "../../utils/rsa-public-key-from-der";
import { KeyProvider } from "./key-provider.interface";

export class AwsKmsKeyProvider implements KeyProvider {
    readonly name = "aws-kms";
    private readonly client: KMSClient;
    private readonly keyIds: string[];

    constructor(config: {
        region: string;
        previousKeyId?: string;
        currentKeyId?: string;
        nextKeyId?: string;
    }) {
        this.client = new KMSClient({ region: config.region });
        this.keyIds = [config.previousKeyId, config.currentKeyId, config.nextKeyId]
            .filter((id): id is string => !!id);
    }

    async getCurrentPublicKeys(): Promise<PublicKey[]> {
        return Promise.all(this.keyIds.map((keyId) => this.fetchPublicKey(keyId)));
    }

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
