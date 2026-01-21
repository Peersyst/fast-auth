import { createMock, MethodMock } from "@shared/test";
import { IFastAuthProvider } from "../../src/core";

export const FastAuthProviderMock = createMock<IFastAuthProvider>({
    isLoggedIn: new MethodMock("mockReturnValue", undefined),
    requestTransactionSignature: new MethodMock("mockReturnValue", undefined),
    requestDelegateActionSignature: new MethodMock("mockReturnValue", undefined),
    getSignatureRequest: new MethodMock("mockReturnValue", undefined),
    getPath: new MethodMock("mockReturnValue", undefined),
    logout: new MethodMock("mockReturnValue", undefined),
    login: new MethodMock("mockReturnValue", undefined),
});
