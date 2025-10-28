import { FastAuthClientNetwork, FastAuthContracts } from "../../core/client/client.types";

/**
 * Get the contracts for the given network.
 * @param network The network to get the contracts for.
 * @returns The contracts for the given network.
 */
export function getContractsFromNetwork(network: FastAuthClientNetwork): FastAuthContracts {
    switch (network) {
        case "mainnet":
            return {
                mpcContractId: "v1.signer",
                fastAuthContractId: "fast-auth.near",
            };
        case "testnet":
            return {
                mpcContractId: "v1.signer-prod.testnet",
                fastAuthContractId: "fast-auth-beta-001.testnet",
            };
    }
}
