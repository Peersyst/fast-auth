import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";

// Import mocks
import {
    mockDecodeJwt,
    mockEncodeTransaction,
    mockEncodeDelegateAction,
    mockLocation,
    setupGlobalLocationMock,
    mockAuth0Client,
} from "./mocks";
import { JavascriptProvider } from "../src";
import { JavascriptProviderOptions } from "../src/types";
import { JavascriptProviderError, JavascriptProviderErrorCodes } from "../src/errors";

// Mock the utils module directly, avoiding TDZ by requiring inside factory
jest.mock("../src/utils", () => {
    const m = require("./mocks");
    return {
        encodeTransaction: m.encodeTransaction,
        encodeDelegateAction: m.encodeDelegateAction,
    };
});

// Mock jose module directly, avoiding TDZ
jest.mock("jose", () => {
    const m = require("./mocks");
    return {
        decodeJwt: m.decodeJwt,
    };
});

// Mock Auth0Client directly, avoiding TDZ
jest.mock("@auth0/auth0-spa-js", () => {
    const m = require("./mocks");
    return {
        Auth0Client: jest.fn().mockImplementation(() => m.mockAuth0Client),
    };
});

// Setup mocks
setupGlobalLocationMock();

describe("JavascriptProvider", () => {
    let provider: JavascriptProvider;
    let mockOptions: JavascriptProviderOptions;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAuth0Client.clearMocks();

        mockOptions = {
            domain: "test-domain.auth0.com",
            clientId: "test-client-id",
            audience: "test-audience",
        };

        provider = new JavascriptProvider(mockOptions);
    });

    describe("isLoggedIn", () => {
        beforeEach(() => {
            mockLocation.search = "";
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

            it("should return false when user is not authenticated with code and state, and no token exists", async () => {
                mockLocation.search = "?code=test-code&state=test-state";
                mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
                mockAuth0Client.isAuthenticated.mockResolvedValue(false);
                mockAuth0Client.checkSession.mockResolvedValue(undefined);
                mockAuth0Client.getTokenSilently.mockResolvedValue(null);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            });

            it("should return true when redirect callback fails but token exists", async () => {
                mockLocation.search = "?code=test-code&state=test-state";
                mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
                mockAuth0Client.isAuthenticated.mockResolvedValue(false);
                mockAuth0Client.checkSession.mockResolvedValue(undefined);
                mockAuth0Client.getTokenSilently.mockResolvedValue("valid-token");

                const result = await provider.isLoggedIn();

                expect(result).toBe(true);
                expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            });

            it("should return false when no code and state in URL and no token exists", async () => {
                mockLocation.search = "";
                mockAuth0Client.checkSession.mockResolvedValue(undefined);
                mockAuth0Client.getTokenSilently.mockResolvedValue(null);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).not.toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            });

            it("should return true when no code and state in URL but token exists", async () => {
                mockLocation.search = "";
                mockAuth0Client.checkSession.mockResolvedValue(undefined);
                mockAuth0Client.getTokenSilently.mockResolvedValue("valid-token");

                const result = await provider.isLoggedIn();

                expect(result).toBe(true);
                expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).not.toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            });

            it("should return false when only code is present and no token exists", async () => {
                mockLocation.search = "?code=test-code";
                mockAuth0Client.checkSession.mockResolvedValue(undefined);
                mockAuth0Client.getTokenSilently.mockResolvedValue(null);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).not.toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            });

            it("should return false when only state is present and no token exists", async () => {
                mockLocation.search = "?state=test-state";
                mockAuth0Client.checkSession.mockResolvedValue(undefined);
                mockAuth0Client.getTokenSilently.mockResolvedValue(null);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).not.toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            });

            it("should return false when handleRedirectCallback throws an error and no token exists", async () => {
                mockLocation.search = "?code=test-code&state=test-state";
                mockAuth0Client.handleRedirectCallback.mockRejectedValue(new Error("Auth error"));
                mockAuth0Client.checkSession.mockResolvedValue(undefined);
                mockAuth0Client.getTokenSilently.mockResolvedValue(null);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).not.toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            });

            it("should return false when isAuthenticated throws an error and no token exists", async () => {
                mockLocation.search = "?code=test-code&state=test-state";
                mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
                mockAuth0Client.isAuthenticated.mockRejectedValue(new Error("Auth error"));
                mockAuth0Client.checkSession.mockResolvedValue(undefined);
                mockAuth0Client.getTokenSilently.mockResolvedValue(null);

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
                expect(mockAuth0Client.isAuthenticated).toHaveBeenCalled();
                expect(mockAuth0Client.checkSession).toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            });

            it("should return false when checkSession throws an error", async () => {
                mockLocation.search = "";
                mockAuth0Client.checkSession.mockRejectedValue(new Error("Session check failed"));

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.checkSession).toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).not.toHaveBeenCalled();
            });

            it("should return false when getTokenSilently throws an error", async () => {
                mockLocation.search = "";
                mockAuth0Client.checkSession.mockResolvedValue(undefined);
                mockAuth0Client.getTokenSilently.mockRejectedValue(new Error("Token retrieval failed"));

                const result = await provider.isLoggedIn();

                expect(result).toBe(false);
                expect(mockAuth0Client.checkSession).toHaveBeenCalled();
                expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            });
        });
    });

    describe("login", () => {
        describe("with redirect", () => {
            it("should call loginWithRedirect when redirectUri is provided", async () => {
                const loginOptions = {
                    redirectUri: "http://localhost:3000/custom-callback",
                };

                await provider.login(loginOptions);

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        redirect_uri: loginOptions.redirectUri,
                    },
                });
                expect(mockAuth0Client.loginWithPopup).not.toHaveBeenCalled();
            });

            it("should propagate errors from loginWithRedirect", async () => {
                const error = new Error("Login failed");
                const loginOptions = {
                    redirectUri: "http://localhost:3000/custom-callback",
                };
                mockAuth0Client.loginWithRedirect.mockRejectedValue(error);

                await expect(provider.login(loginOptions)).rejects.toThrow("Login failed");
            });
        });

        describe("with popup", () => {
            it("should call loginWithPopup when no redirectUri is provided", async () => {
                await provider.login();

                expect(mockAuth0Client.loginWithPopup).toHaveBeenCalledWith(undefined);
                expect(mockAuth0Client.loginWithRedirect).not.toHaveBeenCalled();
            });

            it("should call loginWithPopup with options when provided", async () => {
                const loginOptions = {
                    popupOptions: { timeoutInSeconds: 60 },
                };

                await provider.login(loginOptions);

                expect(mockAuth0Client.loginWithPopup).toHaveBeenCalledWith(loginOptions);
                expect(mockAuth0Client.loginWithRedirect).not.toHaveBeenCalled();
            });

            it("should propagate errors from loginWithPopup", async () => {
                const error = new Error("Popup login failed");
                mockAuth0Client.loginWithPopup.mockRejectedValue(error);

                await expect(provider.login()).rejects.toThrow("Popup login failed");
            });
        });
    });

    describe("logout", () => {
        it("should call logout", async () => {
            await provider.logout();

            expect(mockAuth0Client.logout).toHaveBeenCalled();
        });

        it("should propagate errors from logout", async () => {
            const error = new Error("Logout failed");
            mockAuth0Client.logout.mockRejectedValue(error);

            await expect(provider.logout()).rejects.toThrow("Logout failed");
        });
    });

    describe("getPath", () => {
        it("should return correct path when user is logged in", async () => {
            const mockToken = "mock-jwt-token";
            const mockSub = "user123";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue({ sub: mockSub });

            const result = await provider.getPath();

            expect(result).toBe(`jwt#https://${mockOptions.domain}/#${mockSub}`);
            expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            expect(mockDecodeJwt).toHaveBeenCalledWith(mockToken);
        });

        it("should throw Auth0ProviderError when sub is missing", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue({ sub: null });

            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderError);
            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        });

        it("should throw Auth0ProviderError when sub is undefined", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue({ sub: undefined });

            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderError);
            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        });

        it("should throw Auth0ProviderError when sub is empty string", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue({ sub: "" });

            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderError);
            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        });

        it("should propagate errors from getTokenSilently", async () => {
            const error = new Error("Token retrieval failed");
            mockAuth0Client.getTokenSilently.mockRejectedValue(error);

            await expect(provider.getPath()).rejects.toThrow("Token retrieval failed");
        });

        it("should propagate errors from decodeJwt", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockImplementation(() => {
                throw new Error("JWT decode failed");
            });

            await expect(provider.getPath()).rejects.toThrow("JWT decode failed");
        });
    });

    describe("requestTransactionSignature", () => {
        let mockTransaction: Transaction;
        let mockRequestOptions: any;

        beforeEach(() => {
            jest.clearAllMocks();

            mockTransaction = {} as Transaction;
            mockRequestOptions = {
                redirectUri: "http://localhost:3000/callback",
                imageUrl: "https://example.com/image.png",
                name: "Test App",
                transaction: mockTransaction,
            };
        });

        describe("with redirect", () => {
            it("should call loginWithRedirect with correct parameters", async () => {
                const mockEncodedTransaction = [1, 2, 3, 4, 5];
                mockEncodeTransaction.mockReturnValue(mockEncodedTransaction);
                mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);

                await provider.requestTransactionSignature(mockRequestOptions);

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        image_url: mockRequestOptions.imageUrl,
                        name: mockRequestOptions.name,
                        redirect_uri: mockRequestOptions.redirectUri,
                        transaction: mockEncodedTransaction,
                    },
                });
                expect(mockEncodeTransaction).toHaveBeenCalledWith(mockTransaction);
                expect(mockAuth0Client.loginWithPopup).not.toHaveBeenCalled();
            });

            it("should use provided redirectUri in options", async () => {
                const mockEncodedTransaction = [1, 2, 3, 4, 5];
                mockEncodeTransaction.mockReturnValue(mockEncodedTransaction);
                mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);
                const optionsWithRedirectUri = {
                    redirectUri: "http://localhost:3000/custom-callback",
                    imageUrl: "https://example.com/image.png",
                    name: "Test App",
                    transaction: mockTransaction,
                };

                await provider.requestTransactionSignature(optionsWithRedirectUri);

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        image_url: optionsWithRedirectUri.imageUrl,
                        name: optionsWithRedirectUri.name,
                        redirect_uri: optionsWithRedirectUri.redirectUri,
                        transaction: mockEncodedTransaction,
                    },
                });
            });

            it("should propagate errors from loginWithRedirect", async () => {
                const error = new Error("Login redirect failed");
                mockAuth0Client.loginWithRedirect.mockRejectedValue(error);

                await expect(provider.requestTransactionSignature(mockRequestOptions)).rejects.toThrow("Login redirect failed");
            });

            it("should propagate errors from encodeTransaction", async () => {
                const error = new Error("Transaction encoding failed");
                mockEncodeTransaction.mockImplementation(() => {
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
                    imageUrl: "https://example.com/image.png",
                    name: "Test App",
                    transaction: mockTransaction,
                };

                await provider.requestTransactionSignature(optionsWithoutRedirectUri);

                expect(mockAuth0Client.loginWithPopup).toHaveBeenCalledWith({
                    authorizationParams: {
                        image_url: optionsWithoutRedirectUri.imageUrl,
                        name: optionsWithoutRedirectUri.name,
                        transaction: mockEncodedTransaction,
                    },
                });
                expect(mockEncodeTransaction).toHaveBeenCalledWith(mockTransaction);
                expect(mockAuth0Client.loginWithRedirect).not.toHaveBeenCalled();
            });

            it("should propagate errors from loginWithPopup", async () => {
                const error = new Error("Popup login failed");
                mockAuth0Client.loginWithPopup.mockRejectedValue(error);
                const optionsWithoutRedirectUri = {
                    imageUrl: "https://example.com/image.png",
                    name: "Test App",
                    transaction: mockTransaction,
                };

                await expect(provider.requestTransactionSignature(optionsWithoutRedirectUri)).rejects.toThrow("Popup login failed");
            });

            it("should propagate errors from encodeTransaction in popup mode", async () => {
                const error = new Error("Transaction encoding failed");
                mockEncodeTransaction.mockImplementation(() => {
                    throw error;
                });
                const optionsWithoutRedirectUri = {
                    imageUrl: "https://example.com/image.png",
                    name: "Test App",
                    transaction: mockTransaction,
                };

                await expect(provider.requestTransactionSignature(optionsWithoutRedirectUri)).rejects.toThrow(
                    "Transaction encoding failed",
                );
            });
        });
    });

    describe("requestDelegateActionSignature", () => {
        let mockDelegateAction: DelegateAction;
        let mockRequestOptions: any;

        beforeEach(() => {
            jest.clearAllMocks();

            mockDelegateAction = {} as DelegateAction;
            mockRequestOptions = {
                redirectUri: "http://localhost:3000/callback",
                imageUrl: "https://example.com/image.png",
                name: "Test App",
                delegateAction: mockDelegateAction,
            };
        });

        describe("with redirect", () => {
            it("should call loginWithRedirect with correct parameters", async () => {
                const mockEncodedDelegateAction = [1, 2, 3, 4, 5];
                mockEncodeDelegateAction.mockReturnValue(mockEncodedDelegateAction);
                mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);

                await provider.requestDelegateActionSignature(mockRequestOptions);

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        image_url: mockRequestOptions.imageUrl,
                        name: mockRequestOptions.name,
                        redirect_uri: mockRequestOptions.redirectUri,
                        delegateAction: mockEncodedDelegateAction,
                    },
                });
                expect(mockEncodeDelegateAction).toHaveBeenCalledWith(mockDelegateAction);
                expect(mockAuth0Client.loginWithPopup).not.toHaveBeenCalled();
            });

            it("should use provided redirectUri in options", async () => {
                const mockEncodedDelegateAction = [1, 2, 3, 4, 5];
                mockEncodeDelegateAction.mockReturnValue(mockEncodedDelegateAction);
                mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);
                const optionsWithRedirectUri = {
                    redirectUri: "http://localhost:3000/custom-callback",
                    imageUrl: "https://example.com/image.png",
                    name: "Test App",
                    delegateAction: mockDelegateAction,
                };

                await provider.requestDelegateActionSignature(optionsWithRedirectUri);

                expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                    authorizationParams: {
                        image_url: optionsWithRedirectUri.imageUrl,
                        name: optionsWithRedirectUri.name,
                        redirect_uri: optionsWithRedirectUri.redirectUri,
                        delegateAction: mockEncodedDelegateAction,
                    },
                });
            });

            it("should propagate errors from loginWithRedirect", async () => {
                const error = new Error("Login redirect failed");
                mockAuth0Client.loginWithRedirect.mockRejectedValue(error);

                await expect(provider.requestDelegateActionSignature(mockRequestOptions)).rejects.toThrow("Login redirect failed");
            });

            it("should propagate errors from encodeDelegateAction", async () => {
                const error = new Error("Delegate action encoding failed");
                mockEncodeDelegateAction.mockImplementation(() => {
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
                    imageUrl: "https://example.com/image.png",
                    name: "Test App",
                    delegateAction: mockDelegateAction,
                };

                await provider.requestDelegateActionSignature(optionsWithoutRedirectUri);

                expect(mockAuth0Client.loginWithPopup).toHaveBeenCalledWith({
                    authorizationParams: {
                        image_url: optionsWithoutRedirectUri.imageUrl,
                        name: optionsWithoutRedirectUri.name,
                        delegateAction: mockEncodedDelegateAction,
                    },
                });
                expect(mockEncodeDelegateAction).toHaveBeenCalledWith(mockDelegateAction);
                expect(mockAuth0Client.loginWithRedirect).not.toHaveBeenCalled();
            });

            it("should propagate errors from loginWithPopup", async () => {
                const error = new Error("Popup login failed");
                mockAuth0Client.loginWithPopup.mockRejectedValue(error);
                const optionsWithoutRedirectUri = {
                    imageUrl: "https://example.com/image.png",
                    name: "Test App",
                    delegateAction: mockDelegateAction,
                };

                await expect(provider.requestDelegateActionSignature(optionsWithoutRedirectUri)).rejects.toThrow("Popup login failed");
            });

            it("should propagate errors from encodeDelegateAction in popup mode", async () => {
                const error = new Error("Delegate action encoding failed");
                mockEncodeDelegateAction.mockImplementation(() => {
                    throw error;
                });
                const optionsWithoutRedirectUri = {
                    imageUrl: "https://example.com/image.png",
                    name: "Test App",
                    delegateAction: mockDelegateAction,
                };

                await expect(provider.requestDelegateActionSignature(optionsWithoutRedirectUri)).rejects.toThrow(
                    "Delegate action encoding failed",
                );
            });
        });
    });

    describe("getSignatureRequest", () => {
        it("should return correct signature request", async () => {
            const mockToken = "mock-jwt-token";
            const mockDecodedToken = {
                fatxn: new Uint8Array([1, 2, 3, 4, 5]),
            };
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue(mockDecodedToken);

            const result = await provider.getSignatureRequest();

            expect(result).toEqual({
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

            expect(result).toEqual({
                guardId: `jwt#https://${mockOptions.domain}/`,
                verifyPayload: mockToken,
                signPayload: undefined,
            });
        });

        it("should propagate errors from getTokenSilently", async () => {
            const error = new Error("Token retrieval failed");
            mockAuth0Client.getTokenSilently.mockRejectedValue(error);

            await expect(provider.getSignatureRequest()).rejects.toThrow("Token retrieval failed");
        });

        it("should propagate errors from decodeJwt", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockImplementation(() => {
                throw new Error("JWT decode failed");
            });

            await expect(provider.getSignatureRequest()).rejects.toThrow("JWT decode failed");
        });
    });
});
