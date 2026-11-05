import { BaseProviderConfig } from "../types";

export interface IConfigStorage<Config extends BaseProviderConfig> {
    /**
     * Sets the config.
     * @param config The config.
     */
    set(config: Config): Promise<void>;

    /**
     * Gets the config.
     * @returns The config.
     */
    get(): Promise<Config | undefined>;

    /**
     * Clears the config.
     */
    clear(): Promise<void>;
}
