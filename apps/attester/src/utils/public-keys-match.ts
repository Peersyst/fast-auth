import { PublicKey } from "../types/attestation.types";

/**
 * Sorts the public keys by their modulus.
 * @param keys The public keys to sort.
 * @returns The sorted public keys.
 */
export function sortPublicKeys(keys: PublicKey[]): PublicKey[] {
    return keys.sort((a, b) => {
        return a.n.toString() < b.n.toString() ? -1 : 1;
    });
}

/**
 * Checks if two public keys match.
 * @param a The first public key.
 * @param b The second public key.
 * @returns If match.
 */
export function publicKeysMatch(a: PublicKey[], b: PublicKey[]) {
    if (a.length !== b.length) return false;

    const sA = sortPublicKeys(a);
    const sB = sortPublicKeys(b);

    for (let i = 0; i < sA.length; i++) {
        if (!numberArraysEqual(sA[i].e, sB[i].e) || !numberArraysEqual(sA[i].n, sB[i].n)) return false;
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
