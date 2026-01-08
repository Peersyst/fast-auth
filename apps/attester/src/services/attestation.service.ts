import { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { PublicKey } from "../types/attestation.types";
import { publicKeysMatch } from "../utils/public-keys-match";
import { ContractPublicKeysService } from "./contract-public-keys.service";
import { GooglePublicKeysService } from "./google-public-keys.service";

export class AttestationService {
    constructor(
        private readonly contractPublicKeysService: ContractPublicKeysService,
        private readonly googlePublicKeysService: GooglePublicKeysService,
    ) {}

    /**
     * Returns a list of public keys that needs to be attested.
     * @returns The list of public keys.
     */
    async shouldAttest(): Promise<{ shouldAttest: boolean; contractPublicKeys: PublicKey[]; apiPublicKeys: PublicKey[] }> {
        const apiPublicKeys = await this.googlePublicKeysService.getCurrentPublicKeys();
        const contractPublicKeys = await this.contractPublicKeysService.getCurrentPublicKeys();
        if (publicKeysMatch(apiPublicKeys, contractPublicKeys)) return { shouldAttest: false, contractPublicKeys, apiPublicKeys };

        const currentAttestation = await this.contractPublicKeysService.getCurrentAttestation();
        if (publicKeysMatch(currentAttestation.publicKeys, apiPublicKeys))
            return { shouldAttest: false, contractPublicKeys, apiPublicKeys };

        return { shouldAttest: true, contractPublicKeys, apiPublicKeys };
    }

    /**
     * Syncs the public keys with the guard contract.
     * @param publicKeys The public keys to sync.
     * @returns An empty promise.
     */
    async sync(publicKeys: PublicKey[]): Promise<void> {
        const guardPublicKeys = await this.contractPublicKeysService.getGuardPublicKeys();
        if (publicKeysMatch(guardPublicKeys, publicKeys)) return;
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
