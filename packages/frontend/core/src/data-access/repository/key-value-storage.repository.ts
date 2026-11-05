import { AbstractRepository } from "./abstract.repository";
import { IStorage } from "./storage";

export class KeyValueStorageRepository<T extends Record<string, any>> extends AbstractRepository {
    constructor(
        storageKey: string,
        private readonly storage: IStorage<T[keyof T]>,
    ) {
        super(storageKey);
    }

    /**
     * Sets the value in the repository.
     * @param key The key to set.
     * @param value The value to set.
     * @returns A promise that resolves when the value is set.
     */
    protected set(key: keyof T, value: T[keyof T]): Promise<void> {
        return Promise.resolve(this.storage.setItem(`${this.storageKey}:${key as string}`, value));
    }

    /**
     * Gets the value from the repository.
     * @param key The key to get.
     * @returns The value from the repository.
     */
    protected get(key: keyof T): Promise<T[keyof T] | undefined> {
        return Promise.resolve(this.storage.getItem(`${this.storageKey}:${key as string}`));
    }

    /**
     * Clears the repository.
     * @param key The key to clear.
     * @returns A promise that resolves when the repository is cleared.
     */
    protected clear(key: keyof T): Promise<void> {
        return Promise.resolve(this.storage.removeItem(`${this.storageKey}:${key as string}`));
    }
}
