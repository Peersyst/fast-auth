import { createMock, MethodMock } from "@shared/test";
import { Connection, Signer } from "near-api-js";
import { Provider } from "near-api-js/lib/providers";

const ProviderMock = createMock<Provider>({
    accessKeyChanges: new MethodMock("mockReturnValue", undefined),
    accountChanges: new MethodMock("mockReturnValue", undefined),
    block: new MethodMock("mockReturnValue", undefined),
    blockChanges: new MethodMock("mockReturnValue", undefined),
    chunk: new MethodMock("mockReturnValue", undefined),
    contractCodeChanges: new MethodMock("mockReturnValue", undefined),
    contractStateChanges: new MethodMock("mockReturnValue", undefined),
    experimental_protocolConfig: new MethodMock("mockReturnValue", undefined),
    gasPrice: new MethodMock("mockReturnValue", undefined),
    lightClientProof: new MethodMock("mockReturnValue", undefined),
    nextLightClientBlock: new MethodMock("mockReturnValue", undefined),
    sendTransactionAsync: new MethodMock("mockReturnValue", undefined),
    sendTransactionUntil: new MethodMock("mockReturnValue", undefined),
    singleAccessKeyChanges: new MethodMock("mockReturnValue", undefined),
    status: new MethodMock("mockReturnValue", undefined),
    txStatus: new MethodMock("mockReturnValue", undefined),
    txStatusReceipts: new MethodMock("mockReturnValue", undefined),
    validators: new MethodMock("mockReturnValue", undefined),
    query: new MethodMock("mockReturnValue", undefined),
    sendTransaction: new MethodMock("mockReturnValue", undefined),
});

export const SignerMock = createMock<Signer>({
    createKey: new MethodMock("mockReturnValue", undefined),
    getPublicKey: new MethodMock("mockReturnValue", undefined),
    signMessage: new MethodMock("mockReturnValue", undefined),
});

export const ConnectionMock = createMock<Connection>({
    jsvmAccountId: "",
    provider: new ProviderMock(),
    signer: new SignerMock(),
    getConnection: new MethodMock("mockReturnValue", undefined),
    networkId: "",
});
