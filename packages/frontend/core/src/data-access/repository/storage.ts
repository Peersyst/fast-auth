export interface IStorage<T = any> {
    setItem(key: string, value: T): void | Promise<void>;
    getItem(key: string): T | undefined | Promise<T | undefined>;
    removeItem(key: string): void | Promise<void>;
}

/**
 * Infers a storage for a given type.
 * @param storage The storage to infer.
 * @returns The inferred storage for the given type.
 */
export function storageFor<T>(storage: IStorage): IStorage<T> {
    return storage as IStorage<T>;
}
