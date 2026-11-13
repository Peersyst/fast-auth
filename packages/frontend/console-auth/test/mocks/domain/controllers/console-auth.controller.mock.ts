import { createMock, MethodMock } from "@shared/test";
import { IConsoleAuthController } from "../../../../src/ui/interfaces";
import { MeMock } from "@shared/console/test/mocks/auth";

export const ConsoleAuthControllerMock = createMock<IConsoleAuthController>({
    getSession: new MethodMock("mockResolvedValue", { isAuthenticated: true, email: "owner@example.com" }),
    signIn: new MethodMock("mockResolvedValue"),
    continueInTab: new MethodMock("mockResolvedValue"),
    signOut: new MethodMock("mockResolvedValue"),
    getIdToken: new MethodMock("mockResolvedValue", "id-token"),
    refreshSession: new MethodMock("mockResolvedValue"),
    getMe: new MethodMock("mockResolvedValue", new MeMock()),
});
