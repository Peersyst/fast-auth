export type FastAuthClientNetwork = "mainnet" | "testnet";

export type FastAuthContracts = {
    mpcContractId: string;
    fastAuthContractId: string;
};

export type FastAuthClientOptions = FastAuthContracts;