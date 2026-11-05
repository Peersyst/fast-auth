import { Singleton, ISingleton } from "../../common/utils/singleton/singleton";

export interface IController<T extends { new (...args: any[]): {} } = any> extends ISingleton<T> {}

/**
 * Decorator for a controller.
 * @returns The controller.
 */
export function Controller(): <T extends { new (...args: any[]): {} }>(constructor: T) => IController<T> {
    return function Controller<T extends { new (...args: any[]): {} }>(constructor: T): IController<T> {
        return Singleton()<T>(constructor);
    };
}
