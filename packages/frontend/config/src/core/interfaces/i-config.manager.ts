import { EventEmitter } from "@frontend/events";
import { Config } from "../types";
import { DeepPick, NestedKeys } from "@swisstype/essential";
import { BaseConfig, BaseProviderConfig } from "../manager";

export type ConfigManagerEvents<Config extends BaseConfig, ProviderConfig extends BaseProviderConfig = Omit<Config, "version">> = {
    /**
     * Emitted when the config is loaded.
     * @param config The config.
     */
    load: (config: Config) => void;

    /**
     * Emitted when the config is outdated.
     * @param outdatedConfig The outdated config.
     * @param providerConfig The provider config.
     */
    outdated: (outdatedConfig: Config, providerConfig: ProviderConfig) => void;
};

export interface IConfigManager {
    /**
     * The config.
     */
    config: Config;

    /**
     * The initialization promise.
     */
    initialization: Promise<void>;

    /**
     * Whether the config is fetched from the provider and stored in the storage.
     */
    isLoaded: boolean;

    /**
     * Whether the config is outdated and needs to be update.
     */
    isOutdated: boolean;

    /**
     * Adds an event listener.
     * @param event The event.
     * @param listener The listener.
     */
    on: EventEmitter<ConfigManagerEvents<Config>>["on"];

    /**
     * Adds an event listener that is only called once.
     * @param event The event.
     * @param listener The listener.
     */
    once: EventEmitter<ConfigManagerEvents<Config>>["once"];

    /**
     * Loads the config.
     */
    load(): Promise<void>;

    /**
     * Reloads the config.
     */
    reload(): Promise<void>;

    /**
     * Gets all the config.
     */
    getAll(): Config;

    /**
     * Gets all the config asynchronously.
     */
    getAllAsync(): Promise<Config>;

    /**
     * Gets a value from the config.
     * @param key The key.
     */
    get<K extends NestedKeys<Config>>(key: K): DeepPick<Config, K>;

    /**
     * Gets a value from the config asynchronously.
     * @param key The key.
     */
    getAsync<K extends NestedKeys<Config>>(key: K): Promise<DeepPick<Config, K>>;
}
