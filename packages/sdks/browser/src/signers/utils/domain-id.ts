import { Algorithm } from "../../common/signature/types";

/**
 * Get the domain ID for the algorithm.
 * @param algorithm The algorithm.
 * @returns The domain ID.
 */
export function getDomainId(algorithm: Algorithm): number {
    switch (algorithm) {
        case "secp256k1":
            return 0;
        case "ed25519":
            return 1;
        default:
            throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
}
