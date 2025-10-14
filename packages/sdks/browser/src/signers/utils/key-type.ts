import { KeyType } from "near-api-js/lib/utils/key_pair";
import { FastAuthSignerError } from "../signer.errors";
import { Algorithm } from "../../common/signature/types";
import { FastAuthSignerErrorCodes } from "../signer.error-codes";

/**
 * Get the key type for the algorithm.
 * @param algorithm The algorithm.
 * @returns The key type.
 */
export function getKeyTypeOrFail(algorithm: Algorithm): KeyType {
    switch (algorithm) {
        case "secp256k1":
            return KeyType.SECP256K1;
        case "ed25519":
            return KeyType.ED25519;
        default:
            throw new FastAuthSignerError(FastAuthSignerErrorCodes.UNSUPPORTED_ALGORITHM);
    }
}
