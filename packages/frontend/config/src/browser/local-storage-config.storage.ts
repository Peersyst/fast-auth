import { IConfigStorage } from "../core/manager";
import { Config } from "../core/types";

/**
 * Implementation of IConfigStorage using local storage.
 */
export class LocalStorageConfigStorage implements IConfigStorage<Config> {
    private readonly storageKey = "config";

    /**
     * @inheritdoc
     */
    get(): Promise<Config | undefined> {
        const config = localStorage.getItem(this.storageKey);
        return Promise.resolve(config ? JSON.parse(config) : undefined);
    }

    /**
     * @inheritdoc
     */
    set(config: Config): Promise<void> {
        return Promise.resolve(localStorage.setItem(this.storageKey, JSON.stringify(config)));
    }

    /**
     * @inheritdoc
     */
    clear(): Promise<void> {
        return Promise.resolve(localStorage.removeItem(this.storageKey));
    }
}
