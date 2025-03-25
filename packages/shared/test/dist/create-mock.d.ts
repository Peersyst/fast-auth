import { ExtendedMock, MockData } from "./mock";
export declare function createMock<I extends object = any>(data: MockData<I>): {
    new (customData?: Partial<MockData<I>>): ExtendedMock<I, jest.Mock>;
};
