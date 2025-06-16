import { MethodMock } from "./method-mock";
import { Mock, ExtendedMock, MockData } from "./mock";

/**
 * Creates a global mock.
 * @param data Mocked methods.
 * @returns The mock.
 */
export function createMock<I extends object = any>(
    data: MockData<I>,
): {
    new (customData?: Partial<MockData<I>>): ExtendedMock<I, jest.Mock>;
} {
    const mock = class extends Mock {
        constructor(customData: Partial<MockData<I>> = {}) {
            super();
            for (const [key, item] of Object.entries(data)) {
                if (item instanceof MethodMock) {
                    // @ts-ignore
                    const usedMethod = customData?.[key as keyof MockData<I>] || item;
                    (this as any)[key] = jest.fn()[usedMethod.type](usedMethod.value);
                } else {
                    (this as any)[key] = item;
                }
            }
        }
    };

    return mock as { new (customData?: Partial<MockData<I>>): ExtendedMock<I, jest.Mock> };
}
