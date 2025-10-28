/* eslint-disable @typescript-eslint/no-explicit-any */
import { sha256 } from "@noble/hashes/sha256";
import { base58 } from "@scure/base";
import { Account, connect, KeyPair, keyStores } from "near-api-js";
import { AccessKeyView } from "near-api-js/lib/providers/provider";
import { Action, encodeTransaction, Signature, SignedTransaction, Transaction, transfer } from "near-api-js/lib/transaction";
import { createTransaction } from "near-api-js/lib/transaction";
import { parseNearAmount } from "near-api-js/lib/utils/format";
import { KeyPairString, KeyType, PublicKey } from "near-api-js/lib/utils/key_pair";
import { base_decode } from "near-api-js/lib/utils/serialize";

// Environment variables for relayer configuration
const RELAYER_PRIVATE_KEY = import.meta.env.VITE_RELAYER_PRIVATE_KEY;
const RELAYER_ACCOUNT_ID = import.meta.env.VITE_RELAYER_ACCOUNT_ID;
const FAST_AUTH_CONTRACT_ID = "fast-auth-beta-001.testnet";

// Validate required environment variables
if (!RELAYER_PRIVATE_KEY) {
    throw new Error("VITE_RELAYER_PRIVATE_KEY environment variable is required. Please create a .env file with your relayer credentials.");
}

if (!RELAYER_ACCOUNT_ID) {
    throw new Error("VITE_RELAYER_ACCOUNT_ID environment variable is required. Please create a .env file with your relayer credentials.");
}

class FastAuthRelayer {
    private keyStore: keyStores.InMemoryKeyStore;
    private keyPair: KeyPair;
    private accountId: string;
    private networkId: string;
    private config: any;
    private near: any;
    private account: any;

    constructor() {
        this.keyStore = new keyStores.InMemoryKeyStore();
        this.keyPair = KeyPair.fromString(RELAYER_PRIVATE_KEY as KeyPairString);
        this.accountId = RELAYER_ACCOUNT_ID as string;
        this.networkId = "testnet";
        this.config = {
            networkId: this.networkId,
            keyStore: this.keyStore,
            nodeUrl: `https://rpc.${this.networkId}.near.org`,
            walletUrl: `https://wallet.${this.networkId}.near.org`,
            helperUrl: `https://helper.${this.networkId}.near.org`,
            explorerUrl: `https://explorer.${this.networkId}.near.org`,
        };
        this.near = null;
        this.account = null;
    }

    async init() {
        // Add the key pair for the relayer account
        await this.keyStore.setKey(this.networkId, this.accountId, this.keyPair);

        // Connect to NEAR
        this.near = await connect(this.config);

        // Load the account object
        this.account = new Account(this.near.connection, this.accountId);
    }

    getAccount() {
        if (!this.account) {
            throw new Error("Relayer account not initialized. Call init() first.");
        }
        return this.account;
    }

    getConnection() {
        if (!this.near) {
            throw new Error("NEAR connection not initialized. Call init() first.");
        }
        return this.near;
    }

    async sign(jwt: string) {
        if (!this.account) {
            throw new Error("Relayer account not initialized. Call init() first.");
        }
        try {
            return await this.account.functionCall({
                contractId: FAST_AUTH_CONTRACT_ID,
                methodName: "sign",
                args: { guard_id: "RS256", jwt: jwt, is_legacy: false },
                gas: "300000000000000", // 300 TGas
                attachedDeposit: "1",
            });
        } catch (error) {
            console.error("Error calling sign method:", error);
            throw error;
        }
    }

    async derivePublicKey(sub: string) {
        const publicKey = await this.account.viewFunction({
            contractId: "v1.signer-prod.testnet",
            methodName: "derived_public_key",
            args: { path: sub, predecessor: FAST_AUTH_CONTRACT_ID },
        });
        return publicKey;
    }

    async createAccount(action: Action) {
        try {
            const signerPublicKey = this.keyPair.getPublicKey();
            const accessKey = (await this.getConnection().connection.provider.query(
                `access_key/${this.accountId}/${signerPublicKey}`,
                "",
            )) as AccessKeyView;
            const nonce = ++accessKey.nonce;

            const tx = createTransaction(this.accountId, signerPublicKey, "testnet", nonce, [action], base_decode(accessKey.block_hash));
            await this.account.signAndSendTransaction(tx);
        } catch (error) {
            console.error("Error creating account:", error);
            throw error;
        }
    }

    async createTransfer(signerId: string, signerPublicKey: PublicKey, receiverId: string, amount: string) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const accessKey = await this.getConnection().connection.provider.query<AccessKeyView>(
            `access_key/${signerId}/${signerPublicKey}`,
            "",
        );
        const nonce = ++accessKey.nonce;

        const tx = createTransaction(
            signerId,
            signerPublicKey,
            receiverId,
            nonce,
            [transfer(BigInt(parseNearAmount(amount)!))],
            base_decode(accessKey.block_hash),
        );

        return tx;
    }

    async relaySignAction(action: Action) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const accessKey = await this.getConnection().connection.provider.query<AccessKeyView>(
            `access_key/${this.accountId}/${this.keyPair.getPublicKey()}`,
            "",
        );
        const nonce = ++accessKey.nonce;

        const tx = createTransaction(
            this.accountId,
            this.keyPair.getPublicKey(),
            FAST_AUTH_CONTRACT_ID,
            nonce,
            [action],
            base_decode(accessKey.block_hash),
        );

        const message = encodeTransaction(tx);
        const hash = sha256(message);

        const signature = this.keyPair.sign(hash).signature;
        const signedTransaction = {
            signedTransaction: new SignedTransaction({
                transaction: tx,
                signature: new Signature({
                    keyType: KeyType.ED25519,
                    data: signature,
                }),
            }),
            hash: base58.encode(hash),
        };

        return await this.getConnection().connection.provider.sendTransaction(signedTransaction.signedTransaction);
        
    }

    async send(signature: Uint8Array<ArrayBufferLike>, tx: Transaction) {
        const signedTransaction = new SignedTransaction({
            transaction: tx,
            signature: new Signature({
                keyType: KeyType.SECP256K1,
                data: signature,
            }),
        });

        return await this.getConnection().connection.provider.sendTransaction(signedTransaction);
    }
}

export default FastAuthRelayer;
