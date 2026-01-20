import { FastAuthClient } from "../../src/client/client";
import { FastAuthClientError } from "../../src/client/client.errors";
import { FastAuthClientOptions } from "../../src/client/client.types";
import { ConnectionMock, FastAuthProviderMock, FastAuthSignerGlobalMock } from "../mocks";

jest.mock("../../src/signers/signer", () => {
    const m = require("../mocks");
    return {
        FastAuthSigner: m.FastAuthSignerGlobalMock,
    };
});

describe("FastAuthClient", () => {
    const mockProvider = new FastAuthProviderMock();
    const mockConnection = new ConnectionMock();

    let client: FastAuthClient;

    const options: FastAuthClientOptions = {
        mpcContractId: "mpc.contract.testnet",
        fastAuthContractId: "fa.contract.testnet",
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockConnection.clearMocks();
        mockProvider.clearMocks();

        client = new FastAuthClient(mockProvider, mockConnection, options);
    });

    describe("login", () => {
        it("should delegate to provider.login with args", () => {
            client.login("a", 1, { x: true } as any);
            expect(mockProvider.login).toHaveBeenCalledWith("a", 1, { x: true });
        });
    });

    describe("logout", () => {
        it("should delegate to provider.logout", () => {
            client.logout();
            expect(mockProvider.logout).toHaveBeenCalled();
        });
    });

    describe("getSigner", () => {
        it("should throw if user is not logged in", async () => {
            mockProvider.isLoggedIn.mockReturnValue(false);
            await expect(client.getSigner()).rejects.toThrow(FastAuthClientError);
        });

        it("should construct signer with provider, connection, options and call init", async () => {
            mockProvider.isLoggedIn.mockResolvedValue(true);

            const signer = await client.getSigner();

            expect(FastAuthSignerGlobalMock).toHaveBeenCalledWith(mockProvider, mockConnection, options);
            expect(signer.init).toHaveBeenCalled();
        });
    });
});
