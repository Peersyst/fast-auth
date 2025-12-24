import { PublicKey } from "../types/attestation.types";

/**
 * Checks if two public keys match.
 * @param a The first public key.
 * @param b The second public key.
 * @returns If match.
 */
export function publicKeysMatch(a: PublicKey[], b: PublicKey[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (!numberArraysEqual(a[i].e, b[i].e) || !numberArraysEqual(a[i].n, b[i].n)) return false;
    }
    return true;
}

/**
 * Checks if to number arrays are equal.
 * @param a The fist number array.
 * @param b The second number array.
 * @returns If match.
 */
export function numberArraysEqual(a: number[], b: number[]): boolean {
    if (a === b) return true; // same reference
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
