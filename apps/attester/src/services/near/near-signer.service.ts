import { Signer } from "../../utils/near-signer";
import { SignedTransaction, Transaction } from "near-api-js/lib/transaction";
import { PublicKey } from "near-api-js/lib/utils";

export class NearSignerService {
    private signer: Signer;

    constructor(privateKey: string, accountId?: string) {
        this.signer = new Signer(privateKey, accountId);
    }

    /**
     * Gets the address of the signer.
     * @returns The address of the signer.
     */
    getAddress(): string {
        return this.signer.getAddress();
    }

    /**
     * Gets the public key of the signer.
     * @returns The public key of the signer.
     */
    getPublicKey(): PublicKey {
        return this.signer.getPublicKey();
    }

    /**
     * Signs a transaction.
     * @param transaction The transaction to sign.
     * @returns The signed transaction and the hash.
     */
    signTransaction(transaction: Transaction): {
        signedTransaction: SignedTransaction;
        hash: string;
    } {
        return this.signer.signTransaction(transaction);
    }
}
