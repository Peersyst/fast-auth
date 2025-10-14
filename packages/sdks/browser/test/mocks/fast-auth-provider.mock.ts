import { IFastAuthProvider } from "../../src";
import { createMock, MethodMock } from "@shared/test";

export const FastAuthProviderMock = createMock<IFastAuthProvider>({
    login: new MethodMock("mockReturnValue", undefined),
    logout: new MethodMock("mockReturnValue", undefined),
    isLoggedIn: new MethodMock("mockReturnValue", undefined),
    requestTransactionSignature: new MethodMock("mockReturnValue", undefined),
    requestDelegateActionSignature: new MethodMock("mockReturnValue", undefined),
    getSignatureRequest: new MethodMock("mockReturnValue", undefined),
    getPath: new MethodMock("mockReturnValue", undefined),
});
