import { DelegateAction } from "@near-js/transactions";
import {
    encodeTransaction as encodeTransactionNear,
    Transaction,
    encodeDelegateAction as encodeDelegateActionNear,
} from "near-api-js/lib/transaction";

/**
 * Encode a transaction to a number array.
 * @param transaction The transaction to encode.
 * @returns The encoded transaction.
 */
export function encodeTransaction(transaction: Transaction): number[] {
    return encodeTransactionNear(transaction).reduce((acc: number[], curr: number) => {
        acc.push(curr);
        return acc;
    }, [] as number[]);
}

/**
 * Encode a delegate action to a number array.
 * @param delegateAction The delegate action to encode.
 * @returns The encoded delegate action.
 */
export function encodeDelegateAction(delegateAction: DelegateAction): number[] {
    return encodeDelegateActionNear(delegateAction).reduce((acc: number[], curr: number) => {
        acc.push(curr);
        return acc;
    }, [] as number[]);
}

