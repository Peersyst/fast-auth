export declare function mockedFn<T extends (...args: any[]) => any>(fn: T): jest.MockedFunction<T>;
export declare function mockedClass<T extends new (...args: any[]) => any>(cls: T): jest.MockedClass<T>;
