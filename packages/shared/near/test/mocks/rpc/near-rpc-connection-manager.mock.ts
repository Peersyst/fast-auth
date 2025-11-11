import { createMock, MethodMock } from "@shared/test";
import { NearRPCConnectionManager } from "../../../src/rpc/near-rpc-connection-manager";
import { JsonRpcProviderMock } from "../near-api-js/json-rpc-provider.mock";

export const NearRPCConnectionManagerMock = createMock<NearRPCConnectionManager>({
    connectionConfig: {
        nodeUrls: ["rpc-url-1", "rpc-url-2"],
        retries: 1,
        wait: 1000,
        backoff: 1000,
    },
    getProvider: new MethodMock("mockReturnValue", new JsonRpcProviderMock()),
    switchToNextRPC: new MethodMock("mockResolvedValue"),
    handleRateLimitError: new MethodMock("mockResolvedValue"),
});
