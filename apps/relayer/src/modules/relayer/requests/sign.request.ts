import { jwtDecode } from "jwt-decode";
import { BusinessException } from "../../common/exception/business.exception";
import { RelayerErrorCodes } from "../error/relayer-error-codes";

export class SignRequest {
    guard_id: string;
    sign_payload: number[];
    verify_payload: string;
    algorithm: string;
}

/**
 * Validates the Sign Request.
 * @param request The sign request to validate.
 */
export const validate = (request: SignRequest) => {
    // NOTE: Include more guards if needed
    if (request.guard_id !== "jwt#https://login.fast-auth.com/") {
        throw new BusinessException(RelayerErrorCodes.INVALID_GUARD_ID);
    }
    // NOTE: Include more algorithms if needed
    if (request.algorithm !== "eddsa" && request.algorithm !== "ecdsa" && request.algorithm !== "secp256k1") {
        throw new BusinessException(RelayerErrorCodes.INVALID_ALGORITHM);
    }
    try {
        const jwt = jwtDecode(request.verify_payload);
        // TODO: Complete jwt verification signature
        if (jwt.iss !== "https://login.fast-auth.com/") {
            throw new BusinessException(RelayerErrorCodes.INVALID_VERIFY_PAYLOAD);
        }
    } catch (e) {
        console.error(e);
        throw new BusinessException(RelayerErrorCodes.INVALID_VERIFY_PAYLOAD);
    }
    try {
        Uint8Array.from(request.sign_payload);
    } catch (_) {
        throw new BusinessException(RelayerErrorCodes.INVALID_SIGN_PAYLOAD);
    }
};
