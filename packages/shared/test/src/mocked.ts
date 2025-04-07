/**
 * Infers a mocked function.
 * @param fn The function to infer.
 * @returns The inferred mocked function.
 */
export function mockedFn<T extends (...args: any[]) => any>(fn: T): jest.MockedFunction<T> {
    return fn as jest.MockedFunction<T>;
}

/**
 * Infers a mocked class.
 * @param cls The class to infer.
 * @returns The inferred mocked class.
 */
export function mockedClass<T extends new (...args: any[]) => any>(cls: T): jest.MockedClass<T> {
    return cls as jest.MockedClass<T>;
}
