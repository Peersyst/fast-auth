// Copied from https://near.github.io/near-api-js/interfaces/_near-js_types.provider_validator.StakedAccount.html

import { BlockId, Finality } from "near-api-js/lib/providers/provider";
import { Transaction } from "near-api-js/lib/transaction";

// near-api-js does not export it...
export type StakedAccount = {
    account_id: string;
    can_withdraw: boolean;
    staked_balance: string;
    unstaked_balance: string;
};

export type SubmittableTransaction = Omit<Transaction, "blockHash" | "nonce" | "decode" | "encode" | "signerId" | "publicKey"> & {
    signerId?: string;
};

export type QueryContractParams<A extends object> = {
    contractId: string;
    methodName: string;
    args: A;
} & ({ blockId: BlockId } | { finality: Finality });
