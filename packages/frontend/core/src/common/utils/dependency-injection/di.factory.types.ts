import { IFactory } from "@shared/utils";

export type IDIFactoryInstance<T extends Record<string, any>> = IFactory<T> & {
    /**
     * Creates a factory.
     * @param modules The modules to create the factory with.
     * @returns The factory.
     */
    create(modules: Record<keyof T, (resolve: T) => T[keyof T]>): IFactory<T>;
};
