import { OmitType, TypeKeys } from "@swisstype/essential";
import { MethodMock } from "./method-mock";
export interface IMock {
    clearMocks(): void;
    resetMocks(): void;
    restoreMocks(): void;
}
export type ExtendedMock<I extends object, T> = {
    [Key in keyof I]: I[Key] extends Function ? T : I[Key];
} & IMock;
export type MockMethods<K extends string | number | symbol> = Record<K, MethodMock>;
export type MockData<I extends object = any> = Pick<MockMethods<keyof I>, TypeKeys<I, Function>> & OmitType<I, Function>;
export declare class Mock implements IMock {
    clearMocks(): void;
    resetMocks(): void;
    restoreMocks(): void;
}
