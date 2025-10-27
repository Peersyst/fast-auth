import { buildConfig } from "@backend/config";
import { parseNearAmount } from "near-api-js/lib/utils/format";

export interface NearConfig {
    /**
     * A pool of private keys of the accounts to use.
     * If defined in environment, use "key1,key2,key3" format
     */
    privateKeys: string[];
    /**
     * The pool of RPC nodes to use.
     * If defined in environment, use "url1,url2,url3" format
     */
    rpcNodeUrls: string[];
    /**
     * The number of RPC retries.
     */
    rpcRetries: number;
    /**
     * The wait time between RPC retries.
     */
    rpcWait: number;
    /**
     * The backoff time between RPC retries.
     */
    rpcBackoff: number;
    /**
     * The fast auth contract id.
     */
    fastAuthContractId: string;
    /**
     * The mpc contract id.
     */
    mpcContractId: string;
    /**
     * The account contract id.
     */
    accountContractId: string;
    /**
     * The JWT guard id.
     */
    guardId: string;
    /**
     * The JWT issuer.
     */
    issuer: string;
    /**
     * The deposit amount for the mpc contract.
     */
    mpcDepositAmount: bigint;
    /**
     * The time to wait to get a new recent block hash in ms.
     */
    recentBlockHashTimeout: number;
}

/**
 * Builds the near configuration.
 * @param secrets The secrets.
 * @returns The near configuration.
 */
export default (secrets: Record<any, any>): NearConfig => {
    return buildConfig<NearConfig>({
        privateKeys: {
            default: process.env.NEAR_PRIVATE_KEYS?.split(",") || [],
            production: secrets.NEAR_PRIVATE_KEYS?.split(","),
        },
        rpcNodeUrls: {
            default: process.env.NEAR_RPC_URLS?.split(",") ?? [
                "https://rpc.mainnet.near.org",
                "https://near.lava.build",
                "https://free.rpc.fastnear.com",
                "https://1rpc.io/near",
            ],
            production: secrets.NEAR_RPC_URLS?.split(","),
        },
        rpcRetries: {
            default: process.env.NEAR_RPC_RETRIES ? parseInt(process.env.NEAR_RPC_RETRIES) : 3,
            production: secrets.NEAR_RPC_RETRIES,
        },
        rpcWait: {
            default: process.env.NEAR_RPC_WAIT ? parseInt(process.env.NEAR_RPC_WAIT) : 1000,
            production: secrets.NEAR_RPC_WAIT,
        },
        rpcBackoff: {
            default: process.env.NEAR_RPC_BACKOFF ? parseFloat(process.env.NEAR_RPC_BACKOFF) : 1.5,
            production: secrets.NEAR_RPC_BACKOFF,
        },
        fastAuthContractId: process.env.NEAR_FAST_AUTH_CONTRACT_ID || "fast-auth.near",
        mpcContractId: process.env.NEAR_MPC_CONTRACT_ID || "v1.signer",
        accountContractId: process.env.NEAR_ACCOUNT_CONTRACT_ID || "near",
        guardId: process.env.NEAR_GUARD_ID || "jwt#https://login.fast-auth.com/",
        issuer: process.env.NEAR_ISSUER || "https://login.fast-auth.com/",
        mpcDepositAmount: BigInt(parseNearAmount(process.env.NEAR_MPC_DEPOSIT_AMOUNT ?? "0.01")!),
        recentBlockHashTimeout: {
            default: process.env.NEAR_RECENT_BLOCK_HASH_TIMEOUT ? parseInt(process.env.NEAR_RECENT_BLOCK_HASH_TIMEOUT) : 36_000_000, // Default to 10 hours
            production: secrets.NEAR_RECENT_BLOCK_HASH_TIMEOUT,
        },
    });
};
