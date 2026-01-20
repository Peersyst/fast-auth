import { createMock, MethodMock } from "@shared/test";

// Create a reusable utils mock
export const UtilsMock = createMock({
    encodeTransaction: new MethodMock("mockReturnValue", undefined),
    encodeDelegateAction: new MethodMock("mockReturnValue", undefined),
});

const utils = new UtilsMock();

export const mockEncodeTransaction = utils.encodeTransaction;
export const mockEncodeDelegateAction = utils.encodeDelegateAction;

// Export in module shape for jest.mock consumption
export const encodeTransaction = utils.encodeTransaction;
export const encodeDelegateAction = utils.encodeDelegateAction;
