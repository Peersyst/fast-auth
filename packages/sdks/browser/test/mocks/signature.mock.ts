import { createMock, MethodMock } from "@shared/test";
import { FastAuthSignature } from "../../src/common/signature/signature";

export const FastAuthSignatureMock = createMock<FastAuthSignature>({
    recover: new MethodMock("mockReturnValue", Buffer.alloc(64, 1)),
});
