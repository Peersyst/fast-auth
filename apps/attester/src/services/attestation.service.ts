import { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { PublicKey } from "../types/attestation.types";
import {publicKeysMatch, sortPublicKeys} from "../utils/public-keys-match";
import { ContractPublicKeysService } from "./contract-public-keys.service";
import { GooglePublicKeysService } from "./google-public-keys.service";
import {LoggerService} from "./logger.service";

export class AttestationService {
    logger = new LoggerService();
    constructor(
        private readonly contractPublicKeysService: ContractPublicKeysService,
        private readonly googlePublicKeysService: GooglePublicKeysService,
    ) {}

    /**
     * Returns a list of public keys that needs to be attested.
     * @returns The list of public keys.
     */
    async shouldAttest(): Promise<{ shouldAttest: boolean; contractPublicKeys: PublicKey[]; apiPublicKeys: PublicKey[] }> {
        let apiPublicKeys = await this.googlePublicKeysService.getCurrentPublicKeys();
        apiPublicKeys = sortPublicKeys(apiPublicKeys);
        let contractPublicKeys = await this.contractPublicKeysService.getCurrentPublicKeys();
        contractPublicKeys = sortPublicKeys(contractPublicKeys);
        if (publicKeysMatch(apiPublicKeys, contractPublicKeys)) return { shouldAttest: false, contractPublicKeys, apiPublicKeys };

        const currentAttestation = await this.contractPublicKeysService.getCurrentAttestation();
        if (currentAttestation && publicKeysMatch(currentAttestation.public_keys, apiPublicKeys))
            return { shouldAttest: true, contractPublicKeys, apiPublicKeys };

        return { shouldAttest: true, contractPublicKeys, apiPublicKeys };
    }

    /**
     * Syncs the public keys with the guard contract.
     * @param publicKeys The public keys to sync.
     * @returns An empty promise.
     */
    async sync(publicKeys: PublicKey[]): Promise<FinalExecutionOutcome | null> {
        const guardPublicKeys = await this.contractPublicKeysService.getGuardPublicKeys();
        if (publicKeysMatch(guardPublicKeys, publicKeys)) {
            this.logger.log("attestation-service", "guard public keys already up to date");
            return null;
        }
        this.logger.log("attestation-service", "syncing guard public keys");
        return this.contractPublicKeysService.syncPublicKeys();
    }

    /**
     * Attest a given public keys.
     * @param publicKeys The public keys to attest.
     * @returns The attest result.
     */
    async attest(publicKeys: PublicKey[]): Promise<FinalExecutionOutcome> {
        return this.contractPublicKeysService.attest(publicKeys);
    }
}
