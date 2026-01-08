import { Attestation, PublicKey } from "../types/attestation.types";
import { NearProviderService } from "./near/near-provider.service";
import { NearTransactionService } from "./near/near-transaction.service";
import { NearSignerService } from "./near/near-signer.service";
import { functionCall } from "near-api-js/lib/transaction";
import { FinalExecutionOutcome } from "near-api-js/lib/providers/provider";

export class ContractPublicKeysService {
    constructor(
        private readonly contractId: string,
        private readonly guardContractId: string,
        private readonly nearProviderService: NearProviderService,
        private readonly nearTransactionService: NearTransactionService,
        private readonly nearSignerService: NearSignerService,
        private readonly attestGas: bigint = 300000000000000n,
        private readonly syncGas: bigint = 300000000000000n,
    ) {}

    /**
     * Get the current public keys from the contract.
     * @returns The current public keys.
     */
    async getCurrentPublicKeys(): Promise<PublicKey[]> {
        return this.nearProviderService.queryContract<PublicKey[], {}>({
            contractId: this.contractId,
            methodName: "get_public_keys",
            args: {},
            finality: "final",
        });
    }

    /**
     * Get the current public keys from the guard contract.
     * @returns The current public keys.
     */
    async getGuardPublicKeys(): Promise<PublicKey[]> {
        return this.nearProviderService.queryContract<PublicKey[], {}>({
            contractId: this.guardContractId,
            methodName: "get_public_keys",
            args: {},
            finality: "final",
        });
    }

    /**
     * Get the current public keys from the guard contract.
     * @returns The current public keys.
     */
    async syncPublicKeys(): Promise<FinalExecutionOutcome> {
        const result = await this.nearTransactionService.signAndBroadcastTransaction({
            receiverId: this.guardContractId,
            actions: [functionCall("set_public_keys", {}, this.syncGas, 0n)],
        });
        if (!this.nearTransactionService.isTransactionSuccessful(result)) {
            throw new Error(`failed to sync ${JSON.stringify(result)}`);
        }
        return result;
    }

    /**
     * Get the current attestation from the contract.
     * @returns The attestation.
     */
    async getCurrentAttestation(): Promise<Attestation> {
        return this.nearProviderService.queryContract<Attestation, { account_id: string }>({
            contractId: this.contractId,
            methodName: "get_attestation",
            args: {
                account_id: this.nearSignerService.getAddress(),
            },
            finality: "final",
        });
    }

    /**
     * Attest a given public keys.
     * @param publicKeys The public keys to attest.
     * @returns The attestation result.
     */
    async attest(publicKeys: PublicKey[]): Promise<FinalExecutionOutcome> {
        const result = await this.nearTransactionService.signAndBroadcastTransaction({
            receiverId: this.contractId,
            actions: [
                functionCall(
                    "attest_public_keys",
                    {
                        public_keys: publicKeys,
                    },
                    this.attestGas,
                    0n,
                ),
            ],
        });
        if (!this.nearTransactionService.isTransactionSuccessful(result)) {
            throw new Error(`failed to attest ${JSON.stringify(result)}`);
        }
        return result;
    }
}
