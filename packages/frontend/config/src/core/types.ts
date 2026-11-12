export type NearNetwork = "testnet" | "mainnet";

export interface CoreConfig {
    backendUrl: string;
    auth0Domain: string;
    auth0ClientId: string;
    nearNetwork: NearNetwork;
}

export interface Config extends CoreConfig {}
