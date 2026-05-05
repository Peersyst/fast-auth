import { createMock, MethodMock } from "@shared/test";
import { Connection } from "near-api-js";
import { Provider } from "near-api-js/lib/providers";

const ProviderMock = createMock<Provider>({
    query: new MethodMock("mockReturnValue", undefined),
    sendTransaction: new MethodMock("mockReturnValue", undefined),
});

export const ConnectionMock = createMock<Connection>({
    provider: new ProviderMock(),
    signer: new MethodMock("mockReturnValue", undefined),
    getConnection: new MethodMock("mockReturnValue", undefined),
    networkId: "",
});
