import { AbstractRepository } from "./abstract.repository";
import { IStorage } from "./storage";

export class StorageRepository<T> extends AbstractRepository {
    constructor(
        storageKey: string,
        private readonly storage: IStorage<T>,
    ) {
        super(storageKey);
    }

    /**
     * Sets the value in the repository.
     * @param value The value to set.
     * @returns A promise that resolves when the value is set.
     */
    protected set(value: T): Promise<void> {
        return Promise.resolve(this.storage.setItem(this.storageKey, value));
    }

    /**
     * Gets the value from the repository.
     * @returns The value from the repository.
     */
    protected get(): Promise<T | undefined> {
        return Promise.resolve(this.storage.getItem(this.storageKey));
    }

    /**
     * Clears the repository.
     * @returns A promise that resolves when the repository is cleared.
     */
    protected clear(): Promise<void> {
        return Promise.resolve(this.storage.removeItem(this.storageKey));
    }
}
