import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";

import {
    mockDecodeJwt,
    mockEncodeTransaction,
    mockEncodeDelegateAction,
    mockLocation,
    setupGlobalLocationMock,
    mockAuth0Client,
} from "./mocks";
import { encodeSignMessage, JavascriptProvider } from "../src";
import {
    JavascriptProviderOptions,
    JavascriptRequestDelegateActionSignatureOptions,
    JavascriptRequestTransactionSignatureOptions,
} from "../src/types";
import { JavascriptProviderError, JavascriptProviderErrorCodes } from "../src/errors";

// Mock the utils module directly, avoiding TDZ by requiring inside factory
jest.mock("../src/utils", () => {
    const m = require("./mocks");
    return {
        encodeTransaction: m.encodeTransaction,
        encodeDelegateAction: m.encodeDelegateAction,
    };
});

// Mock jwt-decode module directly, avoiding TDZ
jest.mock("jwt-decode", () => {
    const m = require("./mocks");
    return {
        __esModule: true,
        default: m.decodeJwt,
    };
});

// Mock Auth0Client directly, avoiding TDZ
jest.mock("@auth0/auth0-spa-js", () => {
    const m = require("./mocks");
    return {
        Auth0Client: jest.fn().mockImplementation(() => m.mockAuth0Client),
    };
});

setupGlobalLocationMock();

describe("JavascriptProvider", () => {
    let provider: JavascriptProvider;
    let mockOptions: JavascriptProviderOptions;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAuth0Client.getIdTokenClaims.mockResolvedValue({ sub: "test-user-id" });

        mockOptions = {
            network: "testnet",
            domain: "test-domain.auth0.com",
            clientId: "test-client-id",
        };

        provider = new JavascriptProvider(mockOptions);
    });

    describe("isLoggedIn", () => {
        beforeEach(() => {
            mockLocation.search = "";
            mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
            mockAuth0Client.isAuthenticated.mockResolvedValue(false);
        });

        describe("redirect callback check", () => {
            it("should return true when user is authenticated with code and state", async () => {
                mockLocation.search = "?code=test-code&state=test-state";
                mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
                mockAuth0Client.isAuthenticated.mockResolvedValue(true);

                const result = await provider.isLoggedIn();

                expect(result).toBe(true);
                expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).not.toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });

            it("should return false when user is not authenticated with code and state", async () => {
                mockLocation.search = "?code=test-code&state=test-state";
                mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
                mockAuth0Client.isAuthenticated.mockResolvedValue(false);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalledTimes(2);
                expect(mockAuth0Client.checkSession).not.toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });

            it("should return true when redirect callback succeeds and fallback authentication succeeds", async () => {
                mockLocation.search = "?code=test-code&state=test-state";
                mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
                mockAuth0Client.isAuthenticated.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

                const result = await provider.isLoggedIn();

                expect(result).toBe(true);
                expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalledTimes(2);
                expect(mockAuth0Client.checkSession).not.toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });

            it("should return false when no code and state in URL and user is not authenticated", async () => {
                mockAuth0Client.isAuthenticated.mockResolvedValue(false);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalledTimes(1);
                expect(mockAuth0Client.checkSession).not.toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });

            it("should return true when no code and state in URL but user is authenticated", async () => {
                mockAuth0Client.isAuthenticated.mockResolvedValue(true);

                const result = await provider.isLoggedIn();

                expect(result).toBe(true);
                expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalledTimes(1);
                expect(mockAuth0Client.checkSession).not.toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });

            it("should return false when only code is present and user is not authenticated", async () => {
                mockLocation.search = "?code=test-code";
                mockAuth0Client.isAuthenticated.mockResolvedValue(false);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalledTimes(1);
                expect(mockAuth0Client.checkSession).not.toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });

            it("should return false when only state is present and user is not authenticated", async () => {
                mockLocation.search = "?state=test-state";
                mockAuth0Client.isAuthenticated.mockResolvedValue(false);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalledTimes(1);
                expect(mockAuth0Client.checkSession).not.toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });

            it("should return false when handleRedirectCallback throws an error and user is not authenticated", async () => {
                mockLocation.search = "?code=test-code&state=test-state";
                mockAuth0Client.handleRedirectCallback.mockRejectedValueOnce(new Error("Auth error"));
                mockAuth0Client.isAuthenticated.mockResolvedValue(false);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalledTimes(1);
                expect(mockAuth0Client.checkSession).not.toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });

            it("should return false when isAuthenticated throws an error", async () => {
                mockLocation.search = "?code=test-code&state=test-state";
                mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
                mockAuth0Client.isAuthenticated.mockRejectedValue(new Error("Auth error"));

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).not.toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });

            it("should return false when fallback isAuthenticated throws an error", async () => {
                mockAuth0Client.isAuthenticated.mockRejectedValue(new Error("Session check failed"));

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).not.toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });
        });
    });

    describe("login", () => {
        describe("with redirect", () => {
            it("should call loginWithRedirect when redirectUri is provided", async () => {
                const loginOptions = {
                    redirectUri: "http://localhost:3000/custom-callback",
                };

                const result = await provider.login(loginOptions);

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        redirect_uri: loginOptions.redirectUri,
                    },
                });
                expect(mockAuth0Client.loginWithPopup).not.toHaveBeenCalled();
                expect(result).toEqual({ userId: "test-user-id" });
            });

            it("should pass forceSelectAccount to loginWithRedirect as prompt", async () => {
                const loginOptions = {
                    redirectUri: "http://localhost:3000/custom-callback",
                };

                await provider.login(loginOptions, true);

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        prompt: "login",
                        redirect_uri: loginOptions.redirectUri,
                    },
                });
            });

            it("should propagate errors from loginWithRedirect", async () => {
                const error = new Error("Login failed");
                const loginOptions = {
                    redirectUri: "http://localhost:3000/custom-callback",
                };
                mockAuth0Client.loginWithRedirect.mockRejectedValueOnce(error);

                await expect(provider.login(loginOptions)).rejects.toThrow("Login failed");
            });
        });

        describe("with popup", () => {
            it("should call loginWithPopup when no redirectUri is provided", async () => {
                const result = await provider.login();

                expect(mockAuth0Client.loginWithPopup).toHaveBeenCalledWith({
                    authorizationParams: {
                        prompt: undefined,
                    },
                });
                expect(mockAuth0Client.loginWithRedirect).not.toHaveBeenCalled();
                expect(result).toEqual({ userId: "test-user-id" });
            });

            it("should pass forceSelectAccount to loginWithPopup as prompt", async () => {
                const loginOptions = {};

                await provider.login(loginOptions, true);

                expect(mockAuth0Client.loginWithPopup).toHaveBeenCalledWith({
                    authorizationParams: {
                        prompt: "login",
                    },
                });
                expect(mockAuth0Client.loginWithRedirect).not.toHaveBeenCalled();
            });

            it("should propagate errors from loginWithPopup", async () => {
                const error = new Error("Popup login failed");
                mockAuth0Client.loginWithPopup.mockRejectedValueOnce(error);

                await expect(provider.login()).rejects.toThrow("Popup login failed");
            });
        });
    });

    describe("logout", () => {
        it("should pass the logout options to Auth0", async () => {
            await provider.logout({ logoutParams: { returnTo: "http://localhost:3000" } });

            expect(mockAuth0Client.logout).toHaveBeenCalledWith({ logoutParams: { returnTo: "http://localhost:3000" } });
        });

        it("should propagate errors from logout", async () => {
            const error = new Error("Logout failed");
            mockAuth0Client.logout.mockRejectedValueOnce(error);

            await expect(provider.logout()).rejects.toThrow("Logout failed");
        });
    });

    describe("getPath", () => {
        it("should return correct path when user is logged in", async () => {
            const mockSub = "user123";
            mockAuth0Client.getIdTokenClaims.mockResolvedValue({ sub: mockSub });

            const result = await provider.getPath();

            expect(result).toBe(`jwt#https://${mockOptions.domain}/#${mockSub}`);
            expect(mockAuth0Client.getIdTokenClaims).toHaveBeenCalled();
            expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            expect(mockDecodeJwt).not.toHaveBeenCalled();
        });

        it("should throw JavascriptProviderError when sub is missing", async () => {
            mockAuth0Client.getIdTokenClaims.mockResolvedValue({ sub: null });

            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderError);
            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        });

        it("should throw JavascriptProviderError when sub is undefined", async () => {
            mockAuth0Client.getIdTokenClaims.mockResolvedValue({ sub: undefined });

            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderError);
            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        });

        it("should throw JavascriptProviderError when sub is empty string", async () => {
            mockAuth0Client.getIdTokenClaims.mockResolvedValue({ sub: "" });

            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderError);
            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        });

        it("should propagate errors from getIdTokenClaims", async () => {
            const error = new Error("Claims retrieval failed");
            mockAuth0Client.getIdTokenClaims.mockRejectedValueOnce(error);

            await expect(provider.getPath()).rejects.toThrow("Claims retrieval failed");
        });

        it("should throw JavascriptProviderError when claims are undefined", async () => {
            mockAuth0Client.getIdTokenClaims.mockResolvedValue(undefined);

            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderError);
            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        });
    });

    describe("requestTransactionSignature", () => {
        const mockTransaction = {} as Transaction;
        const mockRequestOptions: JavascriptRequestTransactionSignatureOptions = {
            redirectUri: "http://localhost:3000/callback",
            transaction: mockTransaction,
        };

        describe("with redirect", () => {
            it("should call loginWithRedirect with correct parameters", async () => {
                const mockEncodedTransaction = [1, 2, 3, 4, 5];
                mockEncodeTransaction.mockReturnValue(mockEncodedTransaction);
                mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);

                const result = await provider.requestTransactionSignature(mockRequestOptions);

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        audience: "auth0.jwt.fast-auth.testnet",
                        scope: "transaction:sign",
                        redirect_uri: mockRequestOptions.redirectUri,
                        transaction: mockEncodedTransaction,
                    },
                });
                expect(mockEncodeTransaction).toHaveBeenCalledWith(mockTransaction);
                expect(mockAuth0Client.loginWithPopup).not.toHaveBeenCalled();
                expect(result).toEqual({ userId: "test-user-id" });
            });

            it("should propagate errors from loginWithRedirect", async () => {
                const error = new Error("Login redirect failed");
                mockAuth0Client.loginWithRedirect.mockRejectedValueOnce(error);

                await expect(provider.requestTransactionSignature(mockRequestOptions)).rejects.toThrow("Login redirect failed");
            });

            it("should propagate errors from encodeTransaction", async () => {
                const error = new Error("Transaction encoding failed");
                mockEncodeTransaction.mockImplementationOnce(() => {
                    throw error;
                });

                await expect(provider.requestTransactionSignature(mockRequestOptions)).rejects.toThrow("Transaction encoding failed");
            });
        });

        describe("with popup", () => {
            it("should call loginWithPopup with correct parameters when redirectUri is not provided", async () => {
                const mockEncodedTransaction = [1, 2, 3, 4, 5];
                mockEncodeTransaction.mockReturnValue(mockEncodedTransaction);
                mockAuth0Client.loginWithPopup.mockResolvedValue(undefined);
                const optionsWithoutRedirectUri = {
                    transaction: mockTransaction,
                };

                await provider.requestTransactionSignature(optionsWithoutRedirectUri);

                expect(mockAuth0Client.loginWithPopup).toHaveBeenCalledWith({
                    authorizationParams: {
                        audience: "auth0.jwt.fast-auth.testnet",
                        scope: "transaction:sign",
                        transaction: mockEncodedTransaction,
                    },
                });
                expect(mockEncodeTransaction).toHaveBeenCalledWith(mockTransaction);
                expect(mockAuth0Client.loginWithRedirect).not.toHaveBeenCalled();
            });

            it("should propagate errors from loginWithPopup", async () => {
                const error = new Error("Popup login failed");
                mockAuth0Client.loginWithPopup.mockRejectedValueOnce(error);
                const optionsWithoutRedirectUri = {
                    transaction: mockTransaction,
                };

                await expect(provider.requestTransactionSignature(optionsWithoutRedirectUri)).rejects.toThrow("Popup login failed");
            });
        });
    });

    describe("requestDelegateActionSignature", () => {
        const mockDelegateAction = {} as DelegateAction;
        const mockRequestOptions: JavascriptRequestDelegateActionSignatureOptions = {
            redirectUri: "http://localhost:3000/callback",
            delegateAction: mockDelegateAction,
        };

        describe("with redirect", () => {
            it("should call loginWithRedirect with correct parameters", async () => {
                const mockEncodedDelegateAction = [1, 2, 3, 4, 5];
                mockEncodeDelegateAction.mockReturnValue(mockEncodedDelegateAction);
                mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);

                const result = await provider.requestDelegateActionSignature(mockRequestOptions);

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        audience: "auth0.jwt.fast-auth.testnet",
                        scope: "transaction:sign",
                        redirect_uri: mockRequestOptions.redirectUri,
                        delegateAction: mockEncodedDelegateAction,
                    },
                });
                expect(mockEncodeDelegateAction).toHaveBeenCalledWith(mockDelegateAction);
                expect(mockAuth0Client.loginWithPopup).not.toHaveBeenCalled();
                expect(result).toEqual({ userId: "test-user-id" });
            });

            it("should propagate errors from loginWithRedirect", async () => {
                const error = new Error("Login redirect failed");
                mockAuth0Client.loginWithRedirect.mockRejectedValueOnce(error);

                await expect(provider.requestDelegateActionSignature(mockRequestOptions)).rejects.toThrow("Login redirect failed");
            });

            it("should propagate errors from encodeDelegateAction", async () => {
                const error = new Error("Delegate action encoding failed");
                mockEncodeDelegateAction.mockImplementationOnce(() => {
                    throw error;
                });

                await expect(provider.requestDelegateActionSignature(mockRequestOptions)).rejects.toThrow(
                    "Delegate action encoding failed",
                );
            });
        });

        describe("with popup", () => {
            it("should call loginWithPopup with correct parameters when redirectUri is not provided", async () => {
                const mockEncodedDelegateAction = [1, 2, 3, 4, 5];
                mockEncodeDelegateAction.mockReturnValue(mockEncodedDelegateAction);
                mockAuth0Client.loginWithPopup.mockResolvedValue(undefined);
                const optionsWithoutRedirectUri = {
                    delegateAction: mockDelegateAction,
                };

                await provider.requestDelegateActionSignature(optionsWithoutRedirectUri);

                expect(mockAuth0Client.loginWithPopup).toHaveBeenCalledWith({
                    authorizationParams: {
                        audience: "auth0.jwt.fast-auth.testnet",
                        scope: "transaction:sign",
                        delegateAction: mockEncodedDelegateAction,
                    },
                });
                expect(mockEncodeDelegateAction).toHaveBeenCalledWith(mockDelegateAction);
                expect(mockAuth0Client.loginWithRedirect).not.toHaveBeenCalled();
            });

            it("should propagate errors from loginWithPopup", async () => {
                const error = new Error("Popup login failed");
                mockAuth0Client.loginWithPopup.mockRejectedValueOnce(error);
                const optionsWithoutRedirectUri = {
                    delegateAction: mockDelegateAction,
                };

                await expect(provider.requestDelegateActionSignature(optionsWithoutRedirectUri)).rejects.toThrow("Popup login failed");
            });
        });
    });

    describe("requestMessageSignature", () => {
        const signMessageParams = {
            message: "Sign in to Example",
            recipient: "example.near",
            nonce: new Uint8Array(32).fill(7),
            callbackUrl: "https://example.com/cb",
        };
        const encodedMessage = encodeSignMessage(signMessageParams);

        describe("with redirect", () => {
            it("should call loginWithRedirect with the encoded NEP-413 message", async () => {
                mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);

                const result = await provider.requestMessageSignature({
                    ...signMessageParams,
                    redirectUri: "http://localhost:3000/callback",
                });

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        audience: "auth0.jwt.fast-auth.testnet",
                        scope: "transaction:sign",
                        redirect_uri: "http://localhost:3000/callback",
                        nep413: encodedMessage,
                    },
                });
                expect(mockAuth0Client.loginWithPopup).not.toHaveBeenCalled();
                expect(result).toEqual({ userId: "test-user-id" });
            });

            it("should pass the remaining login options through to loginWithRedirect", async () => {
                mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);

                await provider.requestMessageSignature({
                    ...signMessageParams,
                    redirectUri: "http://localhost:3000/callback",
                    appState: { returnTo: "/dashboard" },
                });

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        audience: "auth0.jwt.fast-auth.testnet",
                        scope: "transaction:sign",
                        redirect_uri: "http://localhost:3000/callback",
                        nep413: encodedMessage,
                    },
                    appState: { returnTo: "/dashboard" },
                });
            });
        });

        describe("with popup", () => {
            it("should call loginWithPopup with the encoded NEP-413 message when redirectUri is not provided", async () => {
                mockAuth0Client.loginWithPopup.mockResolvedValue(undefined);

                const result = await provider.requestMessageSignature(signMessageParams);

                expect(mockAuth0Client.loginWithPopup).toHaveBeenCalledWith({
                    authorizationParams: {
                        audience: "auth0.jwt.fast-auth.testnet",
                        scope: "transaction:sign",
                        nep413: encodedMessage,
                    },
                });
                expect(mockAuth0Client.loginWithRedirect).not.toHaveBeenCalled();
                expect(result).toEqual({ userId: "test-user-id" });
            });
        });

        it("should encode the NEP-413 payload byte-for-byte as the spec lays it out", () => {
            const nonce = Uint8Array.from({ length: 32 }, (_, i) => i);
            const nonceBytes = Array.from(nonce);
            const tagLittleEndian = [0x9d, 0x01, 0x00, 0x80];
            const messageByteLength = [3, 0, 0, 0];
            const messageUtf8 = [0x68, 0xc3, 0xa9];
            const recipientByteLength = [1, 0, 0, 0];
            const recipientUtf8 = [0x61];
            const noCallbackUrl = [0];
            const someCallbackUrl = [1, 1, 0, 0, 0, 0x63];
            const head = [
                ...tagLittleEndian,
                ...messageByteLength,
                ...messageUtf8,
                ...nonceBytes,
                ...recipientByteLength,
                ...recipientUtf8,
            ];

            expect(encodeSignMessage({ message: "hé", recipient: "a", nonce })).toEqual([...head, ...noCallbackUrl]);
            expect(encodeSignMessage({ message: "hé", recipient: "a", nonce, callbackUrl: "c" })).toEqual([...head, ...someCallbackUrl]);
        });

        it("should reject a nonce that is not 32 bytes before opening Auth0", async () => {
            await expect(provider.requestMessageSignature({ ...signMessageParams, nonce: new Uint8Array(31) })).rejects.toThrow(
                "NEP-413 nonce must be 32 bytes, got 31",
            );
            await expect(provider.requestMessageSignature({ ...signMessageParams, nonce: new Uint8Array(33) })).rejects.toThrow(
                "NEP-413 nonce must be 32 bytes, got 33",
            );
            expect(mockAuth0Client.loginWithPopup).not.toHaveBeenCalled();
            expect(mockAuth0Client.loginWithRedirect).not.toHaveBeenCalled();
        });
    });

    describe("getSignatureRequest", () => {
        it("should return correct signature request", async () => {
            const mockToken = "mock-jwt-token";
            const mockDecodedToken = {
                fatxn: [1, 2, 3, 4, 5],
            };
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue(mockDecodedToken);

            const result = await provider.getSignatureRequest();

            expect(result.signatureRequest).toEqual({
                guardId: `jwt#https://${mockOptions.domain}/`,
                verifyPayload: mockToken,
                signPayload: mockDecodedToken.fatxn,
            });
            expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            expect(mockDecodeJwt).toHaveBeenCalledWith(mockToken);
        });

        it("should handle missing fatxn in decoded token", async () => {
            const mockToken = "mock-jwt-token";
            const mockDecodedToken = {};
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue(mockDecodedToken);

            const result = await provider.getSignatureRequest();

            expect(result.signatureRequest).toEqual({
                guardId: `jwt#https://${mockOptions.domain}/`,
                verifyPayload: mockToken,
                signPayload: undefined,
            });
        });

        it("should propagate errors from getTokenSilently", async () => {
            const error = new Error("Token retrieval failed");
            mockAuth0Client.getTokenSilently.mockRejectedValueOnce(error);

            await expect(provider.getSignatureRequest()).rejects.toThrow("Token retrieval failed");
        });

        it("should propagate errors from decodeJwt", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockImplementationOnce(() => {
                throw new Error("JWT decode failed");
            });

            await expect(provider.getSignatureRequest()).rejects.toThrow("JWT decode failed");
        });
    });
});
