import { Account, connect, KeyPair, keyStores } from "near-api-js";

// TODO: Replace with your actual private key and account ID
const RELAYER_PRIVATE_KEY = "ed25519:5txww6eaySfKnDTXDRK7H425qpiTyk4biE6rPeC6qwdzYDv5Xw5S258yWXdafgdfwdEBcW3SvfKJ9L5BNVMnitmJ"; // Replace with your private key
const RELAYER_ACCOUNT_ID = "bosisthenear.testnet"; // Replace with your account ID
const FAST_AUTH_CONTRACT_ID = "demo-fa-v4.testnet";

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
        this.keyPair = KeyPair.fromString(RELAYER_PRIVATE_KEY);
        this.accountId = RELAYER_ACCOUNT_ID;
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

        console.log(`Relayer account ${this.accountId} loaded successfully.`);
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

    async sign(message: string, jwt: string) {
        if (!this.account) {
            throw new Error("Relayer account not initialized. Call init() first.");
        }

        try {
            const messageBytes: number[] = [];
            new TextEncoder().encode(message as string).forEach((b) => {
                messageBytes.push(b);
            });
            return await this.account.functionCall({
                contractId: FAST_AUTH_CONTRACT_ID,
                methodName: "sign",
                args: { guard_id: "RS256", payload: messageBytes, jwt: jwt },
                gas: "300000000000000", // 300 TGas
                attachedDeposit: "1",
            });
        } catch (error) {
            console.error("Error calling sign method:", error);
            throw error;
        }
    }
}

export default FastAuthRelayer;
