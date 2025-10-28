import { createMock, MethodMock } from "@shared/test";

// Create a reusable jose mock
export const JoseMock = createMock({
    decodeJwt: new MethodMock("mockReturnValue", undefined),
});

const jose = new JoseMock();

// Backwards-compatible named exports
export const mockDecodeJwt = jose.decodeJwt;
export const decodeJwt = jose.decodeJwt;
