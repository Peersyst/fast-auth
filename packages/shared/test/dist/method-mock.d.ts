export type MethodMockType = Extract<keyof jest.MockInstance<any, any>, "mockReturnValue" | "mockResolvedValue" | "mockRejectedValue" | "mockImplementation" | "mockReturnThis">;
export declare class MethodMock {
    type: MethodMockType;
    value: any;
    constructor(type: MethodMockType, value?: any);
}
