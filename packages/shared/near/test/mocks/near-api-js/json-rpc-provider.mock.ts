import { createMock, MethodMock } from "@shared/test";
import { JsonRpcProvider } from "near-api-js/lib/providers";

export const JsonRpcProviderMock = createMock<JsonRpcProvider>({
    query: new MethodMock("mockResolvedValue"),
    status: new MethodMock("mockResolvedValue"),
    sendTransactionUntil: new MethodMock("mockResolvedValue"),
    sendTransaction: new MethodMock("mockResolvedValue"),
    sendTransactionAsync: new MethodMock("mockResolvedValue"),
    txStatus: new MethodMock("mockResolvedValue"),
    txStatusReceipts: new MethodMock("mockResolvedValue"),
    block: new MethodMock("mockResolvedValue"),
    blockChanges: new MethodMock("mockResolvedValue"),
    chunk: new MethodMock("mockResolvedValue"),
    validators: new MethodMock("mockResolvedValue"),
    experimental_protocolConfig: new MethodMock("mockResolvedValue"),
    lightClientProof: new MethodMock("mockResolvedValue"),
    nextLightClientBlock: new MethodMock("mockResolvedValue"),
    accessKeyChanges: new MethodMock("mockResolvedValue"),
    singleAccessKeyChanges: new MethodMock("mockResolvedValue"),
    accountChanges: new MethodMock("mockResolvedValue"),
    contractStateChanges: new MethodMock("mockResolvedValue"),
    contractCodeChanges: new MethodMock("mockResolvedValue"),
    gasPrice: new MethodMock("mockResolvedValue"),
    sendJsonRpc: new MethodMock("mockResolvedValue"),
    connection: { url: "" },
    options: {
        retries: 0,
        wait: 0,
        backoff: 0,
    },
});
