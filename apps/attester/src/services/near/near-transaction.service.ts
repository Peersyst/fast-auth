import { NearProviderService } from "./near-provider.service";
import { NearSignerService } from "./near-signer.service";
import { SignedTransaction, Transaction } from "near-api-js/lib/transaction";
import { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { SubmittableTransaction } from "../../types/near.types";
import { base_decode } from "near-api-js/lib/utils/serialize";

/**
 * Service for handling near transactions.
 * Coupled with the signer service private key.
 */
export class NearTransactionService {
    constructor(
        private readonly nearProviderService: NearProviderService,
        private readonly nearSignerService: NearSignerService,
    ) {}

    /**
     * Autofills a transaction.
     * @param transaction The transaction to autofill.
     * @returns The autofilled transaction.
     */
    async autofill(transaction: SubmittableTransaction): Promise<Transaction> {
        const signerId = this.nearSignerService.getAddress();
        const publicKey = this.nearSignerService.getPublicKey();
        const publicKeyString = publicKey.toString();

        const accessKey = await this.nearProviderService.queryAccessKey(signerId, publicKeyString);

        return new Transaction({
            ...transaction,
            signerId,
            publicKey: publicKey,
            nonce: BigInt(accessKey.nonce) + BigInt(1),
            blockHash: base_decode(accessKey.block_hash),
        });
    }

    /**
     * Signs and broadcasts a transaction.
     * @param transaction The transaction to sign and broadcast.
     * @returns The final execution outcome.
     */
    async signAndBroadcastTransaction(transaction: SubmittableTransaction): Promise<FinalExecutionOutcome> {
        const tx = await this.autofill(transaction);
        const { signedTransaction } = this.nearSignerService.signTransaction(tx);
        return this.nearProviderService.broadcastTransaction(signedTransaction);
    }

    /**
     * Signs a transaction.
     * @param transaction The transaction to sign.
     * @returns The signed transaction.
     */
    async signTransaction(transaction: SubmittableTransaction): Promise<{ signedTransaction: SignedTransaction; hash: string }> {
        const tx = await this.autofill(transaction);
        return this.nearSignerService.signTransaction(tx);
    }

    /**
     * Broadcasts a transaction.
     * @param transaction The transaction to broadcast.
     * @returns The final execution outcome.
     */
    async broadcastTransaction(transaction: SignedTransaction): Promise<FinalExecutionOutcome> {
        return this.nearProviderService.broadcastTransaction(transaction);
    }

    /**
     * Checks if a transaction was successful.
     * @param outcome The final execution outcome.
     * @returns Whether the transaction was successful.
     */
    isTransactionSuccessful(outcome: FinalExecutionOutcome): boolean {
        return outcome.receipts_outcome.every(
            (receipt: any) =>
                receipt.outcome.status !== "Failure" &&
                !(typeof receipt.outcome.status === "object" && "Failure" in receipt.outcome.status),
        );
    }
}
