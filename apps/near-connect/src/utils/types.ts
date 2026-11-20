// Adapted from HOT Labs' near-connect (https://github.com/hot-dao/near-selector), MIT License.
import type { ConnectorAction } from "./action";

export type Network = "mainnet" | "testnet";

export interface SignInParams {
    network: Network;
    addFunctionCallKey?: unknown;
}

export interface SignMessagePayload {
    message: string;
    recipient: string;
    nonce: Uint8Array;
    callbackUrl?: string;
}

export interface SignMessageParams extends SignMessagePayload {
    network: Network;
    signerId?: string;
}

export interface SignedMessage {
    accountId: string;
    publicKey: string;
    signature: string;
}

export interface SignInAndSignMessageParams extends SignInParams {
    messageParams: SignMessagePayload;
}

export interface TransactionRequest {
    receiverId: string;
    actions: ConnectorAction[];
}

export interface SignAndSendTransactionParams extends TransactionRequest {
    network: Network;
    signerId?: string;
}

export interface SignAndSendTransactionsParams {
    network: Network;
    signerId?: string;
    transactions: TransactionRequest[];
}
