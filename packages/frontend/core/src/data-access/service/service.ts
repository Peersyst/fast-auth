import { Singleton, ISingleton } from "../../common/utils/singleton/singleton";

export interface IService<T extends { new (...args: any[]): {} } = any> extends ISingleton<T> {}

/**
 * Decorator for a service.
 * @returns The service.
 */
export function Service(): <T extends { new (...args: any[]): {} }>(constructor: T) => IService<T> {
    return function Service<T extends { new (...args: any[]): {} }>(constructor: T): IService<T> {
        return Singleton()<T>(constructor);
    };
}
