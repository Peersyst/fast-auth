import { NearTransactionService } from "./services/near/near-transaction.service";
import { NearProviderService } from "./services/near/near-provider.service";
import { NearSignerService } from "./services/near/near-signer.service";
import { ContractPublicKeysService } from "./services/contract-public-keys.service";
import { AttestationService } from "./services/attestation.service";
import { KeyPair } from "near-api-js";
import "dotenv/config";
import { LoggerService } from "./services/logger.service";
import { KeyProvider } from "./services/key-providers/key-provider.interface";
import { GoogleKeyProvider } from "./services/key-providers/google-key-provider";
import { AwsKmsKeyProvider } from "./services/key-providers/aws-kms-key-provider";

const Logger = new LoggerService();

type Config = {
    privateKey: string;
    accountId: string | undefined;
    nodeUrl: string;
    contractId: string;
    guardContractId: string;
    keyProvider: KeyProvider;
};

/**
 * Builds the key provider based on the KEY_PROVIDER environment variable.
 * @returns The configured key provider instance.
 */
function buildKeyProvider(): KeyProvider {
    const provider = process.env.KEY_PROVIDER ?? "kms";

    if (provider === "google") {
        const defaultUrl = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
        const url = process.env.GOOGLE_CERTIFICATES_URL ?? defaultUrl;
        if (!process.env.GOOGLE_CERTIFICATES_URL) {
            Logger.warn("config", `env GOOGLE_CERTIFICATES_URL not found, defaulting to ${defaultUrl}.`);
        }
        Logger.log("config", `using Google key provider (url: ${url})`);
        return new GoogleKeyProvider(url);
    }

    if (provider === "kms") {
        const region = process.env.KMS_REGION;
        if (!region) throw new Error("KMS_REGION is required when KEY_PROVIDER=kms");

        const previousKeyId = process.env.KMS_PREVIOUS_KEY_ID;
        const currentKeyId = process.env.KMS_CURRENT_KEY_ID;
        const nextKeyId = process.env.KMS_NEXT_KEY_ID;

        if (!previousKeyId && !currentKeyId && !nextKeyId) {
            throw new Error("KMS_*_KEY_ID keys must be set when KEY_PROVIDER=kms");
        }

        Logger.log("config", "using AWS KMS key provider");
        return new AwsKmsKeyProvider({ region, previousKeyId, currentKeyId, nextKeyId });
    }

    throw new Error(`Unknown KEY_PROVIDER: ${provider}. Must be "google" or "kms".`);
}

/**
 * Loads and validates the attester configuration from environment variables.
 * @returns The validated configuration object.
 */
function loadConfig(): Config {
    const privateKey = process.env.PRIVATE_KEY ?? "";
    KeyPair.fromString(privateKey);

    const accountId = process.env.ACCOUNT_ID;
    if (!accountId) {
        Logger.warn("loadConfig", "env ACCOUNT_ID not found, using implicit account.");
    }

    const nodeUrl = process.env.NODE_URL;
    if (!nodeUrl) {
        throw new Error("env NODE_URL not found.");
    }

    const contractId = process.env.CONTRACT_ID;
    if (!contractId) {
        throw new Error("env CONTRACT_ID not found.");
    }

    const guardContractId = process.env.GUARD_CONTRACT_ID;
    if (!guardContractId) {
        throw new Error("env GUARD_CONTRACT_ID not found.");
    }

    return {
        privateKey,
        accountId,
        nodeUrl,
        contractId,
        guardContractId,
        keyProvider: buildKeyProvider(),
    };
}

/**
 * Entry point: loads config, checks if attestation is needed, and syncs public keys.
 */
async function main() {
    Logger.log("main", "loading config...");
    const config = loadConfig();
    Logger.debug("main", `config loaded ${JSON.stringify({ ...config, privateKey: "***", keyProvider: config.keyProvider.name })}`);

    const nearSignerService = new NearSignerService(config.privateKey, config.accountId);
    const nearProviderService = new NearProviderService(config.nodeUrl);
    const nearTransactionService = new NearTransactionService(nearProviderService, nearSignerService);
    const contractPublicKeysService = new ContractPublicKeysService(
        config.contractId,
        config.guardContractId,
        nearProviderService,
        nearTransactionService,
        nearSignerService,
    );

    const attestationService = new AttestationService(contractPublicKeysService, config.keyProvider);

    const { shouldAttest, apiPublicKeys, contractPublicKeys } = await attestationService.shouldAttest();
    if (!shouldAttest) {
        Logger.log("main", "public keys are up to date, we don't need to attest.");
    } else if (apiPublicKeys) {
        Logger.log("main", "new public keys detected, doing attestation...");
        const result = await attestationService.attest(apiPublicKeys);
        Logger.log("main", `attestation done successfully ${JSON.stringify(result)}`);
    }
    const res = await attestationService.sync(contractPublicKeys);
    if (res) {
        Logger.log("main", `sync done successfully ${JSON.stringify(res)}`);
    }
}

/**
 * AWS Lambda handler. Wraps the main function for scheduled (EventBridge) or on-demand invocation.
 */
export const handler = async () => {
    try {
        await main();
        return { statusCode: 200, body: "Attestation completed successfully" };
    } catch (error) {
        Logger.error("handler", `Lambda execution failed: ${error}`);
        throw error;
    }
};

// Run standalone when executed directly (e.g. `node dist/index.js` or `tsx src/index.ts`)
if (require.main === module) {
    main().catch((error) => {
        Logger.error("main", `${error}`);
        process.exit(1);
    });
}
