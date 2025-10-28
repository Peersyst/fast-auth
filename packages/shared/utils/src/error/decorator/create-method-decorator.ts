export type MethodFactory<D extends (...args: any[]) => any> = (
    method: (...args: any[]) => any,
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor,
) => D;

/**
 * Creates a method decorator.
 * @param factory Factory that creates the decorator.
 * @returns The method decorator.
 */
export function createMethodDecorator<D extends (...args: any[]) => any>(
    factory: MethodFactory<D>,
): (...decoratorArgs: Parameters<D>) => MethodDecorator {
    return function (...decoratorArgs: Parameters<D>) {
        return function (target: any, key: string | symbol, descriptor: PropertyDescriptor) {
            const method = descriptor.value;

            descriptor.value = function (...args: any[]): MethodDecorator {
                return factory(() => method.apply(this, args), target, key, descriptor)(...decoratorArgs);
            };
        };
    };
}
