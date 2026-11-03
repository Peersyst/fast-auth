import type * as real from "../near-auth/relayer";

export * from "../near-auth/relayer";

export const relaySignature: typeof real.relaySignature = async (_network, _accessToken, approvedPayload) => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const signature = new Uint8Array(64);
    approvedPayload.forEach((byte, i) => (signature[i % 64] ^= byte));
    return signature;
};
