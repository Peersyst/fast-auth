import { NearTransactionService } from "./services/near/near-transaction.service";
import { NearProviderService } from "./services/near/near-provider.service";
import { NearSignerService } from "./services/near/near-signer.service";
import { GooglePublicKeysService } from "./services/google-public-keys.service";
import { ContractPublicKeysService } from "./services/contract-public-keys.service";
import { AttestationService } from "./services/attestation.service";
import { KeyPair } from "near-api-js";
import "dotenv/config";
import { LoggerService } from "./services/logger.service";

const Logger = new LoggerService();

type Config = {
    privateKey: string;
    accountId: string | undefined;
    nodeUrl: string;
    googleCertificatesUrl: string;
    contractId: string;
    guardContractId: string;
};

/**
 * Loads a config from environment.
 * @returns The loaded config.
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

    let googleCertificatesUrl = process.env.GOOGLE_CERTIFICATES_URL;
    if (!googleCertificatesUrl) {
        googleCertificatesUrl = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
        Logger.warn("loadConfig", `env GOOGLE_CERTIFICATES_URL not found, defaulting to ${googleCertificatesUrl}.`);
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
        googleCertificatesUrl,
        contractId,
        guardContractId,
    };
}

/**
 * The main function.
 */
async function main() {
    Logger.log("main", "loading config...");
    const config = loadConfig();
    Logger.debug("main", `config loaded ${JSON.stringify({ ...config, privateKey: "***" })}`);
    const nearSignerService = new NearSignerService(config.privateKey, config.accountId);
    const nearProviderService = new NearProviderService(config.nodeUrl);
    const nearTransactionService = new NearTransactionService(nearProviderService, nearSignerService);
    const googlePublicKeysService = new GooglePublicKeysService(config.googleCertificatesUrl);
    const contractPublicKeysService = new ContractPublicKeysService(
        config.contractId,
        config.guardContractId,
        nearProviderService,
        nearTransactionService,
        nearSignerService,
    );
    const attestationService = new AttestationService(contractPublicKeysService, googlePublicKeysService);

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

main();
