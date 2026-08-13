import { FastAuthSigner } from "../../src/signers/signer";
import { FastAuthSignerOptions, SignatureRequest } from "../../src/signers/signer.types";
import { ConnectionMock, FastAuthProviderMock } from "../mocks";

describe("FastAuthSigner", () => {
    const mockProvider = new FastAuthProviderMock();
    const mockConnection = new ConnectionMock();
    let signer: FastAuthSigner;
    const options: FastAuthSignerOptions = {
        mpcContractId: "mpc.contract.testnet",
        fastAuthContractId: "fa.contract.testnet",
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockProvider.clearMocks();
        mockConnection.clearMocks();

        signer = new FastAuthSigner(mockProvider, mockConnection, options);
    });

    describe("init", () => {
        it("should set path from provider", async () => {
            mockProvider.getPath.mockResolvedValue("jwt#example/");
            await signer.init();
            // Path is private; we rely on side-effects in getPublicKey later
            expect(mockProvider.getPath).toHaveBeenCalled();
        });
    });

    describe("delegations", () => {
        it("requestTransactionSignature should delegate to provider", async () => {
            const args = [{ foo: "bar" }];
            (mockProvider.requestTransactionSignature as jest.Mock).mockResolvedValue(undefined);
            // @ts-ignore testing spread args passthrough
            await signer.requestTransactionSignature(...(args as any));
            expect(mockProvider.requestTransactionSignature).toHaveBeenCalledWith(...args);
        });

        it("requestDelegateActionSignature should delegate to provider", async () => {
            const args = [{ baz: 1 }];
            (mockProvider.requestDelegateActionSignature as jest.Mock).mockResolvedValue(undefined);
            // @ts-ignore testing spread args passthrough
            await signer.requestDelegateActionSignature(...(args as any));
            expect(mockProvider.requestDelegateActionSignature).toHaveBeenCalledWith(...args);
        });

        it("getSignatureRequest should return provider value", async () => {
            const request: SignatureRequest = {
                guardId: "jwt#guard/",
                verifyPayload: "token",
                signPayload: new Uint8Array([1, 2, 3]),
                algorithm: "eddsa",
            };
            mockProvider.getSignatureRequest.mockResolvedValue(request);
            const result = await signer.getSignatureRequest();
            expect(result).toEqual(request);
        });
    });

    describe("requestMessageSignature", () => {
        it("should delegate to the provider when it supports NEP-413", async () => {
            const args = [{ payload: { message: "Sign in", recipient: "example.com" } }];
            (mockProvider as any).requestMessageSignature = jest.fn().mockResolvedValue({ userId: "u" });
            // @ts-ignore testing spread args passthrough
            await signer.requestMessageSignature(...(args as any));
            expect((mockProvider as any).requestMessageSignature).toHaveBeenCalledWith(...args);
        });

        it("should raise a clear error when the provider does not implement it", async () => {
            // The method is optional on the interface, so an unimplemented provider must fail
            // with an explanation rather than "is not a function".
            delete (mockProvider as any).requestMessageSignature;
            await expect(signer.requestMessageSignature({} as any)).rejects.toThrow(/does not support NEP-413/);
        });
    });

    describe("getImplicitAccountId", () => {
        beforeEach(async () => {
            mockProvider.getPath.mockResolvedValue("jwt#path/");
            await signer.init();
        });

        it("should hex-encode the ed25519 public key", async () => {
            const data = Uint8Array.from(Array.from({ length: 32 }, (_, i) => i));
            (mockConnection.provider.query as jest.Mock).mockResolvedValue({
                result: Buffer.from(JSON.stringify("pk")),
            });
            jest.spyOn(signer, "getPublicKey").mockResolvedValue({ data } as any);

            const accountId = await signer.getImplicitAccountId();

            // A NEAR implicit account id is exactly the 64-char hex of its public key.
            expect(accountId).toBe(Buffer.from(data).toString("hex"));
            expect(accountId).toHaveLength(64);
            expect(accountId).toMatch(/^[0-9a-f]{64}$/);
        });

        it("should always ask for the ed25519 key", async () => {
            const spy = jest.spyOn(signer, "getPublicKey").mockResolvedValue({ data: new Uint8Array(32) } as any);
            await signer.getImplicitAccountId();
            expect(spy).toHaveBeenCalledWith("ed25519");
        });
    });

    describe("getPublicKey (viewFunction)", () => {
        beforeEach(async () => {
            mockProvider.getPath.mockResolvedValue("jwt#path/");
            await signer.init();
        });

        it("should call provider.query with correct args for ed25519 (domain_id 1)", async () => {
            (mockConnection.provider.query as jest.Mock).mockResolvedValue({
                result: Buffer.from(JSON.stringify("pk-ed")),
            });

            const pk = await signer.getPublicKey("ed25519");

            expect(mockConnection.provider.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    request_type: "call_function",
                    account_id: options.mpcContractId,
                    method_name: "derived_public_key",
                }),
            );

            const call = (mockConnection.provider.query as jest.Mock).mock.calls[0][0];
            const args = Buffer.from(call.args_base64, "base64").toString();
            const parsed = JSON.parse(args);
            expect(parsed).toEqual(expect.objectContaining({ path: "jwt#path/", predecessor: options.fastAuthContractId, domain_id: 1 }));
            expect(pk).toBe("pk-ed");
        });

        it("should call provider.query with correct args for secp256k1 (domain_id 0)", async () => {
            (mockConnection.provider.query as jest.Mock).mockResolvedValue({
                result: Buffer.from(JSON.stringify("pk-secp")),
            });

            const pk = await signer.getPublicKey("secp256k1");

            const call = (mockConnection.provider.query as jest.Mock).mock.calls[0][0];
            const args = Buffer.from(call.args_base64, "base64").toString();
            const parsed = JSON.parse(args);
            expect(parsed).toEqual(expect.objectContaining({ path: "jwt#path/", predecessor: options.fastAuthContractId, domain_id: 0 }));
            expect(pk).toBe("pk-secp");
        });
    });

    describe("createSignAction", () => {
        it("should build a functionCall with correct params and defaults", async () => {
            const spy = jest.spyOn(require("near-api-js/lib/transaction"), "functionCall");

            const request: SignatureRequest = {
                guardId: "jwt#guard/",
                verifyPayload: "token",
                signPayload: new Uint8Array([1, 2, 3]),
                algorithm: "eddsa",
            };

            await signer.createSignAction(request);

            expect(spy).toHaveBeenCalledWith(
                "sign",
                expect.objectContaining({
                    guard_id: request.guardId,
                    verify_payload: request.verifyPayload,
                    sign_payload: Array.from(request.signPayload),
                    algorithm: request.algorithm,
                }),
                300000000000000n,
                0n,
            );
        });
    });
});
