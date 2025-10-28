import { KeyPair } from "near-api-js";
import { sha256 } from "@noble/hashes/sha256";
import { PublicKey } from "near-api-js/lib/utils";
import { KeyType } from "near-api-js/lib/utils/key_pair";
import { base58 } from "@scure/base";
import { encodeTransaction, Signature, SignedTransaction, Transaction } from "near-api-js/lib/transaction";

export class Signer {
    private readonly keyPair: KeyPair;

    constructor(privateKey: string) {
        this.keyPair = KeyPair.fromString(privateKey as `ed25519:${string}`);
    }

    /**
     * Signs a transaction.
     * @param transaction The transaction to sign.
     * @returns The signed transaction and the hash.
     */
    signTransaction(transaction: Transaction): { signedTransaction: SignedTransaction; hash: string } {
        const message = encodeTransaction(transaction);
        const hash = sha256(message);
        const signature = this.keyPair.sign(hash).signature;

        return {
            signedTransaction: new SignedTransaction({
                transaction,
                signature: new Signature({
                    keyType: KeyType.ED25519,
                    data: signature,
                }),
            }),
            hash: base58.encode(hash),
        };
    }

    /**
     * Gets the address of the signer.
     * @returns The address of the signer.
     */
    getAddress(): string {
        return Buffer.from(this.keyPair.getPublicKey().data).toString("hex");
    }

    /**
     * Gets the public key of the signer.
     * @returns The public key of the signer.
     */
    getPublicKey(): PublicKey {
        return this.keyPair.getPublicKey();
    }
}
