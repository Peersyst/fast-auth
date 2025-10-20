import { Algorithm } from "../../common/signature/types";
import { FastAuthSignerErrorCodes } from "../signer.error-codes";
import { FastAuthSignerError } from "../signer.errors";

/**
 * Get the domain ID for the algorithm.
 * @param algorithm The algorithm.
 * @returns The domain ID.
 */
export function getDomainIdOrFail(algorithm: Algorithm): number {
    switch (algorithm) {
        case "secp256k1":
            return 0;
        case "ed25519":
            return 1;
        default:
            throw new FastAuthSignerError(FastAuthSignerErrorCodes.UNSUPPORTED_ALGORITHM);
    }
}
