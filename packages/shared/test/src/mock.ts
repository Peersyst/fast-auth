/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { OmitType, TypeKeys } from "@swisstype/essential";
import { MethodMock } from "./method-mock";

export interface IMock {
    clearMocks(): void;
    resetMocks(): void;
    restoreMocks(): void;
}

export type ExtendedMock<I extends object, T> = { [Key in keyof I]: I[Key] extends Function ? T : I[Key] } & IMock;
export type MockMethods<K extends string | number | symbol> = Record<K, MethodMock>;
export type MockData<I extends object = any> = Pick<MockMethods<keyof I>, TypeKeys<I, Function>> & OmitType<I, Function>;

/**
 * Mock class with helper methods
 */
export class Mock implements IMock {
    /**
     * Clears the mocks.
     */
    clearMocks(): void {
        Object.values(this).forEach((value) => {
            if ((value as any)?.mockClear) value.mockClear();
        });
    }

    /**
     * Resets the mocks.
     */
    resetMocks(): void {
        Object.values(this).forEach((value) => {
            if ((value as any)?.mockReset) value.mockReset();
        });
    }

    /**
     * Restores the mocks.
     */
    restoreMocks(): void {
        Object.values(this).forEach((value) => {
            if ((value as any)?.mockRestore) value.mockRestore();
        });
    }
}
