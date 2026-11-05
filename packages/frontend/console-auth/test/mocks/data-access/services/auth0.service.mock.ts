import { createMock, MethodMock } from "@shared/test";
import { IAuth0Service } from "../../../../src/domain/interfaces";

export const Auth0ServiceMock = createMock<IAuth0Service>({
    isAuthenticated: new MethodMock("mockResolvedValue", true),
    getEmail: new MethodMock("mockResolvedValue", "owner@example.com"),
    loginWithPopup: new MethodMock("mockResolvedValue"),
    loginWithRedirect: new MethodMock("mockResolvedValue"),
    logout: new MethodMock("mockResolvedValue"),
    getIdTokenClaims: new MethodMock("mockResolvedValue", undefined),
    renewTokens: new MethodMock("mockResolvedValue"),
});
