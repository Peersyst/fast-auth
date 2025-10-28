import { createMethodDecorator } from "./create-method-decorator";

/**
 * Creates a decorator that will handle errors thrown by the decorated method.
 * @param handler Function that handles the error.
 * @returns The error handler decorator.
 */
export function createErrorHandlerDecorator<A extends any[]>(
    handler: (error: any, ...decoratorArgs: A) => any,
): (...decoratorArgs: A) => MethodDecorator {
    return createMethodDecorator((method) => {
        return function (...decoratorArgs: A) {
            try {
                const result = method();

                if (result && result instanceof Promise) {
                    return result.catch((error) => handler(error, ...decoratorArgs));
                }

                return result;
            } catch (error) {
                handler(error, ...decoratorArgs);
            }
        };
    });
}
