import { createMock, MethodMock } from "@shared/test";
import { IConsoleAuthApi } from "../../../../src/domain/interfaces";
import { MeMock } from "@shared/console/test/mocks/auth";

export const ConsoleAuthApiMock = createMock<IConsoleAuthApi>({
    me: new MethodMock("mockResolvedValue", new MeMock()),
});
