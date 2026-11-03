import { sha256 } from "@noble/hashes/sha2";
import { utils as nearApiUtils } from "near-api-js";

import type { Network } from "../utils/types";

import { getConfig, getGuardId } from "./config";

export const relaySignature = async (
    network: Network,
    accessToken: string,
    approvedPayload: number[],
    publicKey: string,
): Promise<Uint8Array> => {
    const { relayerBaseUrl, auth0Domain } = getConfig(network);

    const response = await fetch(`${relayerBaseUrl}/relayer/fast-auth/sign-tx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            guard_id: getGuardId(auth0Domain),
            verify_payload: accessToken,
            sign_payload: approvedPayload,
            algorithm: "eddsa",
        }),
    }).catch(() => null);

    if (!response) throw new Error("NEAR Auth relayer is unreachable");

    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.message || `NEAR Auth relayer rejected the request (${response.status})`);

    const status = body?.result?.status;
    if (status?.Failure) throw new Error(`NEAR Auth signing failed on chain: ${JSON.stringify(status.Failure)}`);

    const successValue = status?.SuccessValue;
    if (successValue === "") throw new Error("NEAR Auth could not verify the approval on chain");

    const signature = successValue && JSON.parse(Buffer.from(successValue, "base64").toString())?.signature;
    if (!Array.isArray(signature) || signature.length !== 64) throw new Error("NEAR Auth MPC did not return a signature");
    const bytes = Uint8Array.from(signature);
    if (!nearApiUtils.PublicKey.from(publicKey).verify(sha256(Uint8Array.from(approvedPayload)), bytes)) {
        throw new Error("NEAR Auth relayer returned a signature that does not match your key");
    }
    return bytes;
};
