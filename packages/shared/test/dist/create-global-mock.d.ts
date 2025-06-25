import { TypeKeys } from "@swisstype/essential";
import { ExtendedMock, MockMethods } from "./mock";
export type MockDataMethods<C extends object> = Pick<MockMethods<keyof C>, TypeKeys<C, Function>>;
export declare function createGlobalMock<C extends object>(obj: C, data: MockDataMethods<C>): {
    new (customData?: Partial<MockDataMethods<C>>): ExtendedMock<C, jest.SpyInstance>;
};
