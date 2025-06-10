import { encodeTransaction as encodeTransactionNear, Transaction } from "near-api-js/lib/transaction";

/**
 * Encode a transaction to a number array.
 * @param transaction The transaction to encode.
 * @returns The encoded transaction.
 */
export function encodeTransaction(transaction: Transaction): number[] {
    return encodeTransactionNear(transaction).reduce((acc, curr) => {
        acc.push(curr);
        return acc;
    }, [] as number[]);
}

export function formatPath(sub: string): string {
    return sub.split(".")[0];
}
