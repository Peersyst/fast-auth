export type MethodMockType = Extract<
    keyof jest.MockInstance<any, any>,
    "mockReturnValue" | "mockResolvedValue" | "mockRejectedValue" | "mockImplementation" | "mockReturnThis"
>;

/**
 * Method mock class
 */
export class MethodMock {
    type: MethodMockType;
    value: any;

    constructor(type: MethodMockType, value: any = undefined) {
        this.type = type;
        this.value = value;
    }
}
