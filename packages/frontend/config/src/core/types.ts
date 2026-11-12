import { BaseConfig } from "./manager";

export type NearNetwork = "testnet" | "mainnet";

export interface CoreConfig extends BaseConfig {
    projectName: string;
    publicUrl: string;
    backendUrl: string;
    configUrl: string; // Used with the `URLConfigProvider`
    auth0Domain: string;
    auth0ClientId: string;
    nearNetwork: NearNetwork;
}

export interface Config extends CoreConfig {}

export type StaticConfig = Omit<Config, "minRequiredVersion">;

export type ProviderConfig = Omit<Config, "version">;
