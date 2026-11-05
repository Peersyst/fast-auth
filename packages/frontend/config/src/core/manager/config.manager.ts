import { DeepPick, NestedKeys } from "@swisstype/essential";
import { ConfigManagerEventEmitter } from "./events";
import { IConfigProvider, IConfigStorage } from "./interfaces";
import { deepmerge, getAttribute } from "@shared/utils";
import { BaseConfig, MinRequiredVersionConfig } from "./types";

export class ConfigManager<Config extends BaseConfig, ProviderConfig extends Omit<Config, "version"> = Omit<Config, "version">> {
    private logger = console;

    /**
     * The config.
     */
    private _config: Config;
    get config(): Config {
        return this._config;
    }
    private set config(config: Config) {
        this._config = config;
    }

    /**
     * The initialization promise.
     */
    private _initialization: Promise<void>;
    get initialization(): Promise<void> {
        return this._initialization;
    }
    private set initialization(initialization: Promise<void>) {
        this._initialization = initialization;
    }

    /**
     * Whether the config is fetched from the provider and stored in the storage.
     */
    isLoaded = false;

    /**
     * Whether the config is outdated and needs to be update.
     */
    isOutdated = false;

    /**
     * Whether the config is ready to be used.
     * @returns Whether the config is ready to be used.
     */
    private get isReady(): boolean {
        return this.isLoaded || this.isOutdated;
    }

    /**
     * The event emitter.
     */
    private readonly eventEmitter = new ConfigManagerEventEmitter<Config>({ maxListeners: Infinity });

    /**
     * Adds an event listener.
     * @param event The event.
     * @param listener The listener.
     * @returns The unsubscriber function.
     */
    readonly on: ConfigManagerEventEmitter<Config>["on"] = this.eventEmitter.on.bind(this.eventEmitter);

    /**
     * Adds an event listener that is only called once.
     * @param event The event.
     * @param listener The listener.
     * @returns The unsubscriber function.
     */
    readonly once: ConfigManagerEventEmitter<Config>["once"] = this.eventEmitter.once.bind(this.eventEmitter);

    constructor(
        private readonly provider: IConfigProvider<ProviderConfig>,
        private readonly storage: IConfigStorage<ProviderConfig>,
        staticConfig: Config,
        /**
         * The keys to get the min required version from the provider config. Ordered by priority.
         */
        private readonly minRequiredVersionKeys: (keyof MinRequiredVersionConfig)[] = ["minRequiredVersion"],
    ) {
        this.config = staticConfig;

        this.initialization = this.init();
    }

    /**
     * Initializes the config manager.
     */
    private async init(): Promise<void> {
        try {
            await this.load();
        } catch (_) {
            // If load fails, use the available config
            await this.loadFromStorage();
        }
    }

    /**
     * Loads config from the provider and stores it in the storage.
     */
    async load(): Promise<void> {
        const fetchedConfig = await this.provider.fetchConfig();

        const minRequiredVersion = this.minRequiredVersionKeys.reduce((acc, key) => {
            const currMinRequiredVersion = fetchedConfig[key as keyof ProviderConfig] as number;
            if (currMinRequiredVersion && currMinRequiredVersion > acc) {
                return currMinRequiredVersion;
            }
            return acc;
        }, 0);

        // If this.config major version is smaller than fetchedConfig version throw outdated event
        if (minRequiredVersion && this.config.version < minRequiredVersion) {
            this.isOutdated = true;
            this.eventEmitter.emit("outdated", this.config, fetchedConfig);
        } else {
            this.config = deepmerge(this.config, fetchedConfig);
            await this.storage.set(fetchedConfig);
            this.isLoaded = true;
            this.eventEmitter.emit("load", this.config);
        }
    }

    /**
     * Loads config from the storage.
     */
    private async loadFromStorage(): Promise<void> {
        const storedConfig = await this.storage.get();

        if (storedConfig) {
            this.config = deepmerge(this.config, storedConfig);
        }

        this.isLoaded = true;
        this.eventEmitter.emit("load", this.config);
    }

    /**
     * Reloads the config.
     */
    async reload(): Promise<void> {
        await this.initialization;

        if (!this.isReady) {
            await this.load();
        }
    }

    /**
     * Gets the config.
     * @returns The config.
     */
    getAll(): Config {
        if (!this.isReady)
            this.logger.warn(
                `Tried to get config before config was loaded. Be aware that accessing config before it is loaded will return the static config. This warning may be thrown when accessing config in an onInit or too early in the app lifecycle.`,
            );
        return this.config;
    }

    /**
     * Gets the config.
     * @returns The config.
     */
    async getAllAsync(): Promise<Config> {
        await this.initialization;
        return this.config;
    }

    /**
     * Gets the config.
     * @param key The key.
     * @returns The config.
     */
    get<K extends NestedKeys<Config>>(key: K): DeepPick<Config, K> {
        if (!this.isReady)
            this.logger.warn(
                `Tried to get config key "${key}" before config was loaded. Be aware that accessing config before it is loaded will return the static config. This warning may be thrown when accessing config in an onInit or too early in the app lifecycle.`,
            );
        return getAttribute(this.config, key);
    }

    /**
     * Gets the config.
     * @param key The key.
     * @returns The config.
     */
    async getAsync<K extends NestedKeys<Config>>(key: K): Promise<DeepPick<Config, K>> {
        await this.initialization;
        return this.get(key);
    }
}
