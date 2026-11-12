import { BaseProviderConfig } from "../types";

export interface IConfigProvider<Config extends BaseProviderConfig> {
    /**
     * Fetches the config.
     * @returns The config.
     */
    fetchConfig(): Promise<Config>;
}
