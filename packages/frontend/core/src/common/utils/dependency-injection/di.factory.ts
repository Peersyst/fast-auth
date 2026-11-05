import { Factory, IFactory } from "@shared/utils";
import { IDIFactoryInstance } from "./di.factory.types";

/**
 * Creates a factory for dependency injection.
 * @param name The name of the factory.
 * @returns The factory.
 */
export function DIFactory<T extends Record<string, any>>(name: string): IDIFactoryInstance<T> {
    let _ref: IFactory<T> | undefined = undefined;

    function create(modules: Record<keyof T, (resolve: T) => T[keyof T]>): IFactory<T> {
        if (_ref) return _ref;

        _ref = Factory(modules);

        return _ref;
    }

    return new Proxy({} as IDIFactoryInstance<T>, {
        get: function (target, prop) {
            if (prop === "$$typeof") return target[prop];
            if (prop === "create") return create;
            else {
                if (!_ref) {
                    throw new Error(`${name}Factory not initialized`);
                }
                return _ref[prop as keyof IFactory<T>];
            }
        },
    });
}
