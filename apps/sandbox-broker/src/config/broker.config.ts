import { buildConfig, validPositiveInt } from "@backend/config";

export interface BrokerConfig {
    /** How long a sign-in may take, from the dApp's /authorize to Auth0's callback. */
    flowTtlMs: number;
    /** How long the dApp has to redeem the code the broker hands it. */
    codeTtlMs: number;
    /** The most sign-ins, and separately the most codes, held in memory at once. */
    maxPending: number;
}

/**
 * Builds the broker configuration.
 * @returns The broker configuration.
 */
export default (): BrokerConfig => {
    return buildConfig<BrokerConfig>(
        {
            flowTtlMs: process.env.FLOW_TTL_MS ? parseInt(process.env.FLOW_TTL_MS) : 10 * 60 * 1000,
            codeTtlMs: process.env.CODE_TTL_MS ? parseInt(process.env.CODE_TTL_MS) : 60 * 1000,
            maxPending: process.env.MAX_PENDING ? parseInt(process.env.MAX_PENDING) : 10000,
        },
        {
            flowTtlMs: validPositiveInt,
            codeTtlMs: validPositiveInt,
            maxPending: validPositiveInt,
        },
    );
};
