import { KeyType } from "near-api-js/lib/utils/key_pair";
import { FastAuthSignerError } from "../signer.errors";
import { Algorithm } from "../../common/signature/types";
import { FastAuthSignerErrorCodes } from "../signer.error-codes";

export function getKeyTypeOrFail(algorithm: Algorithm): KeyType {
    switch (algorithm) {
        case "secp256k1":
            return KeyType.EDDSA;
        case "ed25519":
            return KeyType.ECDSA;
        default:
            throw new FastAuthSignerError(FastAuthSignerErrorCodes.UNSUPPORTED_ALGORITHM);
    }
}