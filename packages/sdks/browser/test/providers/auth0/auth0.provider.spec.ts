import { Auth0Provider } from "../../../src/providers/auth0/auth0.provider";
import { Auth0ProviderOptions } from "../../../src/providers/auth0/auth0.types";
import { Auth0ProviderError } from "../../../src/providers/auth0/auth0.errors";
import { Auth0ProviderErrorCodes } from "../../../src/providers/auth0/auth0.error-codes";
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
} from "../../mocks";

// Mock the utils module directly, avoiding TDZ by requiring inside factory
jest.mock("../../../src/providers/auth0/utils", () => {
    const m = require("../../mocks");
    return {
        encodeTransaction: m.encodeTransaction,
        encodeDelegateAction: m.encodeDelegateAction,
    };
});

// Mock jose module directly, avoiding TDZ
jest.mock("jose", () => {
    const m = require("../../mocks");
    return {
        decodeJwt: m.decodeJwt,
    };
});

// Mock Auth0Client directly, avoiding TDZ
jest.mock("@auth0/auth0-spa-js", () => {
    const m = require("../../mocks");
    return {
        Auth0Client: jest.fn().mockImplementation(() => m.mockAuth0Client),
    };
});

// Setup mocks
setupGlobalLocationMock();

describe("Auth0Provider", () => {
    let auth0Provider: Auth0Provider;
    let mockOptions: Auth0ProviderOptions;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAuth0Client.clearMocks();

        mockOptions = {
            domain: "test-domain.auth0.com",
            clientId: "test-client-id",
            redirectUri: "http://localhost:3000/callback",
            audience: "test-audience",
        };

        auth0Provider = new Auth0Provider(mockOptions);
    });

    describe("isLoggedIn", () => {
        beforeEach(() => {
            mockLocation.search = "";
        });

        it("should return true when user is authenticated with code and state", async () => {
            mockLocation.search = "?code=test-code&state=test-state";
            mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
            mockAuth0Client.isAuthenticated.mockResolvedValue(true);

            const result = await auth0Provider.isLoggedIn();

            expect(result).toBe(true);
            expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
            expect(mockAuth0Client.isAuthenticated).toHaveBeenCalled();
        });

        it("should return false when user is not authenticated with code and state", async () => {
            mockLocation.search = "?code=test-code&state=test-state";
            mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
            mockAuth0Client.isAuthenticated.mockResolvedValue(false);

            const result = await auth0Provider.isLoggedIn();

            expect(result).toBe(false);
            expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
            expect(mockAuth0Client.isAuthenticated).toHaveBeenCalled();
        });

        it("should return false when no code and state in URL", async () => {
            mockLocation.search = "";

            const result = await auth0Provider.isLoggedIn();

            expect(result).toBe(false);
            expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
            expect(mockAuth0Client.isAuthenticated).not.toHaveBeenCalled();
        });

        it("should return false when only code is present", async () => {
            mockLocation.search = "?code=test-code";

            const result = await auth0Provider.isLoggedIn();

            expect(result).toBe(false);
            expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
            expect(mockAuth0Client.isAuthenticated).not.toHaveBeenCalled();
        });

        it("should return false when only state is present", async () => {
            mockLocation.search = "?state=test-state";

            const result = await auth0Provider.isLoggedIn();

            expect(result).toBe(false);
            expect(mockAuth0Client.handleRedirectCallback).not.toHaveBeenCalled();
            expect(mockAuth0Client.isAuthenticated).not.toHaveBeenCalled();
        });

        it("should return false when handleRedirectCallback throws an error", async () => {
            mockLocation.search = "?code=test-code&state=test-state";
            mockAuth0Client.handleRedirectCallback.mockRejectedValue(new Error("Auth error"));

            const result = await auth0Provider.isLoggedIn();

            expect(result).toBe(false);
            expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
            expect(mockAuth0Client.isAuthenticated).not.toHaveBeenCalled();
        });

        it("should return false when isAuthenticated throws an error", async () => {
            mockLocation.search = "?code=test-code&state=test-state";
            mockAuth0Client.handleRedirectCallback.mockResolvedValue(undefined);
            mockAuth0Client.isAuthenticated.mockRejectedValue(new Error("Auth error"));

            const result = await auth0Provider.isLoggedIn();

            expect(result).toBe(false);
            expect(mockAuth0Client.handleRedirectCallback).toHaveBeenCalled();
            expect(mockAuth0Client.isAuthenticated).toHaveBeenCalled();
        });
    });

    describe("login", () => {
        it("should call loginWithRedirect with correct parameters", async () => {
            await auth0Provider.login();

            expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                authorizationParams: {
                    redirect_uri: mockOptions.redirectUri,
                },
            });
        });

        it("should propagate errors from loginWithRedirect", async () => {
            const error = new Error("Login failed");
            mockAuth0Client.loginWithRedirect.mockRejectedValue(error);

            await expect(auth0Provider.login()).rejects.toThrow("Login failed");
        });
    });

    describe("logout", () => {
        it("should call logout", async () => {
            await auth0Provider.logout();

            expect(mockAuth0Client.logout).toHaveBeenCalled();
        });

        it("should propagate errors from logout", async () => {
            const error = new Error("Logout failed");
            mockAuth0Client.logout.mockRejectedValue(error);

            await expect(auth0Provider.logout()).rejects.toThrow("Logout failed");
        });
    });

    describe("getPath", () => {
        it("should return correct path when user is logged in", async () => {
            const mockToken = "mock-jwt-token";
            const mockSub = "user123";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue({ sub: mockSub });

            const result = await auth0Provider.getPath();

            expect(result).toBe(`jwt#https://${mockOptions.domain}/#${mockSub}`);
            expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
            expect(mockDecodeJwt).toHaveBeenCalledWith(mockToken);
        });

        it("should throw Auth0ProviderError when sub is missing", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue({ sub: null });

            await expect(auth0Provider.getPath()).rejects.toThrow(Auth0ProviderError);
            await expect(auth0Provider.getPath()).rejects.toThrow(Auth0ProviderErrorCodes.USER_NOT_LOGGED_IN);
        });

        it("should throw Auth0ProviderError when sub is undefined", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue({ sub: undefined });

            await expect(auth0Provider.getPath()).rejects.toThrow(Auth0ProviderError);
            await expect(auth0Provider.getPath()).rejects.toThrow(Auth0ProviderErrorCodes.USER_NOT_LOGGED_IN);
        });

        it("should throw Auth0ProviderError when sub is empty string", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockReturnValue({ sub: "" });

            await expect(auth0Provider.getPath()).rejects.toThrow(Auth0ProviderError);
            await expect(auth0Provider.getPath()).rejects.toThrow(Auth0ProviderErrorCodes.USER_NOT_LOGGED_IN);
        });

        it("should propagate errors from getTokenSilently", async () => {
            const error = new Error("Token retrieval failed");
            mockAuth0Client.getTokenSilently.mockRejectedValue(error);

            await expect(auth0Provider.getPath()).rejects.toThrow("Token retrieval failed");
        });

        it("should propagate errors from decodeJwt", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockImplementation(() => {
                throw new Error("JWT decode failed");
            });

            await expect(auth0Provider.getPath()).rejects.toThrow("JWT decode failed");
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

        it("should call loginWithRedirect with correct parameters", async () => {
            const mockEncodedTransaction = [1, 2, 3, 4, 5];
            mockEncodeTransaction.mockReturnValue(mockEncodedTransaction);
            mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);

            await auth0Provider.requestTransactionSignature(mockRequestOptions);

            expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                authorizationParams: {
                    imageUrl: mockRequestOptions.imageUrl,
                    name: mockRequestOptions.name,
                    redirect_uri: mockRequestOptions.redirectUri,
                    transaction: mockEncodedTransaction,
                },
            });
            expect(mockEncodeTransaction).toHaveBeenCalledWith(mockTransaction);
        });

        it("should use default redirectUri when not provided", async () => {
            const mockEncodedTransaction = [1, 2, 3, 4, 5];
            mockEncodeTransaction.mockReturnValue(mockEncodedTransaction);
            mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);
            const optionsWithoutRedirectUri = {
                imageUrl: "https://example.com/image.png",
                name: "Test App",
                transaction: mockTransaction,
            };

            await auth0Provider.requestTransactionSignature(optionsWithoutRedirectUri);

            expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                authorizationParams: {
                    imageUrl: optionsWithoutRedirectUri.imageUrl,
                    name: optionsWithoutRedirectUri.name,
                    redirect_uri: mockOptions.redirectUri,
                    transaction: mockEncodedTransaction,
                },
            });
        });

        it("should propagate errors from loginWithRedirect", async () => {
            const error = new Error("Login redirect failed");
            mockAuth0Client.loginWithRedirect.mockRejectedValue(error);

            await expect(auth0Provider.requestTransactionSignature(mockRequestOptions)).rejects.toThrow("Login redirect failed");
        });

        it("should propagate errors from encodeTransaction", async () => {
            const error = new Error("Transaction encoding failed");
            mockEncodeTransaction.mockImplementation(() => {
                throw error;
            });

            await expect(auth0Provider.requestTransactionSignature(mockRequestOptions)).rejects.toThrow("Transaction encoding failed");
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

        it("should call loginWithRedirect with correct parameters", async () => {
            const mockEncodedDelegateAction = [1, 2, 3, 4, 5];
            mockEncodeDelegateAction.mockReturnValue(mockEncodedDelegateAction);
            mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);

            await auth0Provider.requestDelegateActionSignature(mockRequestOptions);

            expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                authorizationParams: {
                    imageUrl: mockRequestOptions.imageUrl,
                    name: mockRequestOptions.name,
                    redirect_uri: mockRequestOptions.redirectUri,
                    delegateAction: mockEncodedDelegateAction,
                },
            });
            expect(mockEncodeDelegateAction).toHaveBeenCalledWith(mockDelegateAction);
        });

        it("should use default redirectUri when not provided", async () => {
            const mockEncodedDelegateAction = [1, 2, 3, 4, 5];
            mockEncodeDelegateAction.mockReturnValue(mockEncodedDelegateAction);
            mockAuth0Client.loginWithRedirect.mockResolvedValue(undefined);
            const optionsWithoutRedirectUri = {
                imageUrl: "https://example.com/image.png",
                name: "Test App",
                delegateAction: mockDelegateAction,
            };

            await auth0Provider.requestDelegateActionSignature(optionsWithoutRedirectUri);

            expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith({
                authorizationParams: {
                    imageUrl: optionsWithoutRedirectUri.imageUrl,
                    name: optionsWithoutRedirectUri.name,
                    redirect_uri: mockOptions.redirectUri,
                    delegateAction: mockEncodedDelegateAction,
                },
            });
        });

        it("should propagate errors from loginWithRedirect", async () => {
            const error = new Error("Login redirect failed");
            mockAuth0Client.loginWithRedirect.mockRejectedValue(error);

            await expect(auth0Provider.requestDelegateActionSignature(mockRequestOptions)).rejects.toThrow("Login redirect failed");
        });

        it("should propagate errors from encodeDelegateAction", async () => {
            const error = new Error("Delegate action encoding failed");
            mockEncodeDelegateAction.mockImplementation(() => {
                throw error;
            });

            await expect(auth0Provider.requestDelegateActionSignature(mockRequestOptions)).rejects.toThrow(
                "Delegate action encoding failed",
            );
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

            const result = await auth0Provider.getSignatureRequest();

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

            const result = await auth0Provider.getSignatureRequest();

            expect(result).toEqual({
                guardId: `jwt#https://${mockOptions.domain}/`,
                verifyPayload: mockToken,
                signPayload: undefined,
            });
        });

        it("should propagate errors from getTokenSilently", async () => {
            const error = new Error("Token retrieval failed");
            mockAuth0Client.getTokenSilently.mockRejectedValue(error);

            await expect(auth0Provider.getSignatureRequest()).rejects.toThrow("Token retrieval failed");
        });

        it("should propagate errors from decodeJwt", async () => {
            const mockToken = "mock-jwt-token";
            mockAuth0Client.getTokenSilently.mockResolvedValue(mockToken);
            mockDecodeJwt.mockImplementation(() => {
                throw new Error("JWT decode failed");
            });

            await expect(auth0Provider.getSignatureRequest()).rejects.toThrow("JWT decode failed");
        });
    });
});
