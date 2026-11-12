export interface ISingleton<T extends { new (...args: any[]): {} } = any> {
    new (...args: ConstructorParameters<T>): InstanceType<T>;
    /**
     * Gets the instance of the singleton.
     * @returns The instance of the singleton.
     */
    getInstance(): InstanceType<T>;
}

/**
 * Creates a singleton.
 * @returns The singleton.
 */
export function Singleton(): <T extends { new (...args: any[]): {} }>(constructor: T) => ISingleton<T> {
    return function Singleton<T extends { new (...args: any[]): {} }>(constructor: T): ISingleton<T> {
        let instance: InstanceType<T>;
        return class {
            constructor(...args: ConstructorParameters<T>) {
                if (!instance) instance = new constructor(...args) as InstanceType<T>;

                return instance;
            }

            /**
             * Gets the instance of the singleton.
             * @returns The instance of the singleton.
             */
            static getInstance(): InstanceType<T> {
                if (!instance) throw new Error(`${this.name} has not been initialized`);

                return instance;
            }
        } as ISingleton<T>;
    };
}
