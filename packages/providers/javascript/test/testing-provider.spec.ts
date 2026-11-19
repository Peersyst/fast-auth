import { Transaction } from "near-api-js/lib/transaction";
import { DelegateAction } from "@near-js/transactions";
import { mockEncodeDelegateAction, mockEncodeTransaction } from "./mocks";
import { JavascriptTestingProvider } from "../src";
import { JavascriptProviderErrorCodes } from "../src/errors";

jest.mock("../src/utils", () => {
    const m = require("./mocks");
    return {
        encodeTransaction: m.encodeTransaction,
        encodeDelegateAction: m.encodeDelegateAction,
    };
});

jest.mock("@shared/core", () => ({
    ...jest.requireActual("@shared/core"),
    FAST_AUTH_TESTING_TENANTS: {
        testnet: {
            domain: "tenant.example.com",
            signingAudience: "audience.example",
            loginUrl: "https://login.example/login/testnet/",
        },
        "mainnet-testing": {
            domain: "TO_REPLACE_WITH_MAINNET_TESTING_DOMAIN",
            signingAudience: "audience.example",
            loginUrl: "https://login.example/login/mainnet-testing/",
        },
    },
}));

const STATE = "AAECAwQFBgcICQoLDA0ODw";
const LOGIN_ORIGIN = "https://login.example";

/**
 * Build an unsigned JWT that carries the given claims.
 * @param claims The payload claims.
 * @returns The JWT.
 */
const jwt = (claims: object) => `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;

type Popup = { closed: boolean; close: jest.Mock };
type MessageListener = (event: { origin: string; data: unknown; source: unknown }) => void;

/**
 * Build a fake popup window.
 * @returns The popup.
 */
const makePopup = (): Popup => ({ closed: false, close: jest.fn() });

describe("JavascriptTestingProvider", () => {
    let popup: Popup;
    let listeners: MessageListener[];
    let listener: MessageListener | undefined;
    const open = jest.fn();
    const removeEventListener = jest.fn((_: string, fn: MessageListener) => (listeners = listeners.filter((other) => other !== fn)));

    const popupUrl = (call = 0) => new URL(open.mock.calls[call][0]);
    const dispatch = (event: Parameters<MessageListener>[0]) => [...listeners].forEach((fn) => fn(event));
    const respond = (response: Record<string, unknown>, origin = LOGIN_ORIGIN, source: unknown = popup) =>
        dispatch({ origin, source, data: { type: "authorization_response", response } });
    const tokens = (overrides = {}) => ({ id_token: jwt({ sub: "google|1", exp: 2_000_000_000 }), state: STATE, ...overrides });

    beforeEach(() => {
        jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
        jest.clearAllMocks();
        listener = undefined;
        listeners = [];
        popup = makePopup();
        open.mockReturnValue(popup);
        jest.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(((array: Uint8Array) => {
            array.forEach((_, i) => (array[i] = i));
            return array;
        }) as typeof globalThis.crypto.getRandomValues);
        Object.assign(globalThis, {
            location: { origin: "https://dapp.example" },
            open,
            addEventListener: (_: string, fn: MessageListener) => {
                listener = fn;
                listeners.push(fn);
            },
            removeEventListener,
        });
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe("constructor", () => {
        it("should refuse a tenant that still holds a placeholder", () => {
            expect(() => new JavascriptTestingProvider({ tenant: "mainnet-testing" })).toThrow(
                JavascriptProviderErrorCodes.TESTING_TENANT_NOT_CONFIGURED,
            );
        });

        it("should refuse a tenant that does not exist", () => {
            expect(() => new JavascriptTestingProvider({ tenant: "mainnet" as never })).toThrow(
                JavascriptProviderErrorCodes.TESTING_TENANT_NOT_CONFIGURED,
            );
        });

        it("should accept a configured tenant", () => {
            expect(() => new JavascriptTestingProvider({ tenant: "testnet" })).not.toThrow();
        });
    });

    describe("login", () => {
        it("should open the login page in the click, with the dapp origin, scope openid and prompt=login", async () => {
            const pending = new JavascriptTestingProvider({ tenant: "testnet" }).login();

            expect(open).toHaveBeenCalledWith(
                `https://login.example/login/testnet/?origin=https%3A%2F%2Fdapp.example&state=${STATE}&scope=openid&prompt=login`,
                `fast-auth-login-${STATE}`,
                "popup,width=400,height=600",
            );
            popup.closed = true;
            jest.advanceTimersByTime(500);
            await expect(pending).rejects.toThrow(JavascriptProviderErrorCodes.POPUP_CLOSED);
        });

        it("should resolve the user from the tokens the login page posts, then clean up", async () => {
            const pending = new JavascriptTestingProvider({ tenant: "testnet" }).login();
            respond(tokens());

            await expect(pending).resolves.toEqual({ userId: "google|1" });
            expect(popup.close).toHaveBeenCalled();
            expect(removeEventListener).toHaveBeenCalledWith("message", listener);
            jest.advanceTimersByTime(500);
            expect(jest.getTimerCount()).toBe(0);
        });

        it("should ignore a message from another origin, another window, with another state or of another type", async () => {
            const pending = new JavascriptTestingProvider({ tenant: "testnet" }).login();
            const evil = { id_token: jwt({ sub: "evil" }) };
            respond(tokens(evil), "https://evil.example");
            respond(tokens(evil), LOGIN_ORIGIN, makePopup());
            respond(tokens(evil), LOGIN_ORIGIN, null);
            respond(tokens({ ...evil, state: "other-state" }));
            dispatch({ origin: LOGIN_ORIGIN, source: popup, data: { type: "other", response: tokens(evil) } });
            dispatch({ origin: LOGIN_ORIGIN, source: popup, data: null });
            expect(popup.close).not.toHaveBeenCalled();

            respond(tokens());
            await expect(pending).resolves.toEqual({ userId: "google|1" });
        });

        it("should reject when the user closes the popup", async () => {
            const pending = new JavascriptTestingProvider({ tenant: "testnet" }).login();
            popup.closed = true;
            jest.advanceTimersByTime(500);

            await expect(pending).rejects.toThrow(JavascriptProviderErrorCodes.POPUP_CLOSED);
            expect(removeEventListener).toHaveBeenCalledWith("message", listener);
        });

        it("should keep two overlapping logins apart, each in its own popup with its own state", async () => {
            let counter = 0;
            jest.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(((array: Uint8Array) => {
                array.fill(++counter);
                return array;
            }) as typeof globalThis.crypto.getRandomValues);
            const first = makePopup();
            const second = makePopup();
            open.mockReturnValueOnce(first).mockReturnValueOnce(second);

            const pendingFirst = new JavascriptTestingProvider({ tenant: "testnet" }).login();
            const pendingSecond = new JavascriptTestingProvider({ tenant: "testnet" }).login();

            const firstState = "AQEBAQEBAQEBAQEBAQEBAQ";
            const secondState = "AgICAgICAgICAgICAgICAg";
            expect(open.mock.calls.map(([, name]) => name)).toEqual([`fast-auth-login-${firstState}`, `fast-auth-login-${secondState}`]);
            expect(popupUrl(0).searchParams.get("state")).toBe(firstState);
            expect(popupUrl(1).searchParams.get("state")).toBe(secondState);

            const two = { id_token: jwt({ sub: "google|2", exp: 2_000_000_000 }) };
            respond(tokens({ ...two, state: firstState }), LOGIN_ORIGIN, second);
            respond(tokens({ ...two, state: secondState }), LOGIN_ORIGIN, second);
            await expect(pendingSecond).resolves.toEqual({ userId: "google|2" });
            respond(tokens({ state: firstState }), LOGIN_ORIGIN, first);
            await expect(pendingFirst).resolves.toEqual({ userId: "google|1" });

            expect(first.close).toHaveBeenCalled();
            expect(second.close).toHaveBeenCalled();
        });

        it.each([
            ["has no user", jwt({ exp: 2_000_000_000 })],
            ["is not a token", "garbage"],
        ])("should reject an ID token that %s and stay logged out", async (_name, idToken) => {
            const provider = new JavascriptTestingProvider({ tenant: "testnet" });
            const pending = provider.login();
            respond(tokens({ id_token: idToken }));

            await expect(pending).rejects.toThrow(JavascriptProviderErrorCodes.AUTHORIZATION_FAILED);
            expect(await provider.isLoggedIn()).toBe(false);
        });

        it("should reject when the browser blocks the popup", async () => {
            open.mockReturnValue(null);
            await expect(new JavascriptTestingProvider({ tenant: "testnet" }).login()).rejects.toThrow(
                JavascriptProviderErrorCodes.POPUP_BLOCKED,
            );
        });

        it.each([
            ["an Auth0 error", { error: "access_denied", state: STATE }],
            ["a failed token exchange", { error: "token_exchange_failed", state: STATE }],
            ["a bare authorization code", { code: "c", state: STATE }],
        ])("should reject when the login page answers with %s", async (_name, response) => {
            const pending = new JavascriptTestingProvider({ tenant: "testnet" }).login();
            respond(response);
            await expect(pending).rejects.toThrow(JavascriptProviderErrorCodes.AUTHORIZATION_FAILED);
            expect(popup.close).toHaveBeenCalled();
        });
    });

    describe("session", () => {
        const loggedIn = async () => {
            const provider = new JavascriptTestingProvider({ tenant: "testnet" });
            const pending = provider.login();
            respond(tokens());
            await pending;
            return provider;
        };

        it("should be logged out before login", async () => {
            expect(await new JavascriptTestingProvider({ tenant: "testnet" }).isLoggedIn()).toBe(false);
        });

        it("should be logged in after login, and have the path of the user", async () => {
            const provider = await loggedIn();
            expect(await provider.isLoggedIn()).toBe(true);
            expect(await provider.getPath()).toBe("jwt#https://tenant.example.com/#google|1");
        });

        it("should be logged out once the ID token has expired", async () => {
            const provider = await loggedIn();
            jest.setSystemTime(new Date("2034-01-01T00:00:00Z"));
            expect(await provider.isLoggedIn()).toBe(false);
        });

        it("should forget the previous signature request on login, which may be another user", async () => {
            mockEncodeTransaction.mockReturnValue([9, 8, 7]);
            const provider = new JavascriptTestingProvider({ tenant: "testnet" });
            const signing = provider.requestTransactionSignature({ transaction: {} as Transaction });
            respond(tokens({ access_token: jwt({ fatxn: [9, 8, 7] }) }));
            await signing;

            const login = provider.login();
            respond(tokens({ id_token: jwt({ sub: "google|2", exp: 2_000_000_000 }) }));
            await login;

            await expect(provider.getSignatureRequest()).rejects.toThrow(JavascriptProviderErrorCodes.SIGNATURE_REQUEST_NOT_FOUND);
        });

        it("should forget the user on logout", async () => {
            const provider = await loggedIn();
            await provider.logout();
            expect(await provider.isLoggedIn()).toBe(false);
            await expect(provider.getPath()).rejects.toThrow(JavascriptProviderErrorCodes.USER_NOT_LOGGED_IN);
        });
    });

    describe("signature requests", () => {
        const signingTokens = (fatxn: number[] = [9, 8, 7], overrides = {}) => tokens({ access_token: jwt({ fatxn }), ...overrides });

        const expectSignatureUrl = async (pending: Promise<unknown>, payloadParam: string) => {
            expect(popupUrl().toString()).toBe(
                `https://login.example/login/testnet/?origin=https%3A%2F%2Fdapp.example&state=${STATE}` +
                    `&scope=openid+transaction%3Asign&audience=audience.example&${payloadParam}`,
            );
            respond(signingTokens(decodeURIComponent(payloadParam.split("=")[1]).split(",").map(Number)));
            await pending;
        };

        beforeEach(() => mockEncodeTransaction.mockReturnValue([9, 8, 7]));

        it("should request a transaction signature with the encoded transaction", async () => {
            mockEncodeTransaction.mockReturnValue([1, 2, 3]);
            const pending = new JavascriptTestingProvider({ tenant: "testnet" }).requestTransactionSignature({
                transaction: {} as Transaction,
            });
            await expectSignatureUrl(pending, "transaction=1%2C2%2C3");
            await expect(pending).resolves.toEqual({ userId: "google|1" });
        });

        it("should request a delegate action signature with the encoded delegate action", async () => {
            mockEncodeDelegateAction.mockReturnValue([4, 5]);
            const pending = new JavascriptTestingProvider({ tenant: "testnet" }).requestDelegateActionSignature({
                delegateAction: {} as DelegateAction,
            });
            await expectSignatureUrl(pending, "delegateAction=4%2C5");
        });

        it("should request a message signature with the NEP-413 encoding", async () => {
            const pending = new JavascriptTestingProvider({ tenant: "testnet" }).requestMessageSignature({
                message: "hi",
                recipient: "app.example",
                nonce: new Uint8Array(32),
            });
            await expectSignatureUrl(
                pending,
                "nep413=157%2C1%2C0%2C128%2C2%2C0%2C0%2C0%2C104%2C105%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C11%2C0%2C0%2C0%2C97%2C112%2C112%2C46%2C101%2C120%2C97%2C109%2C112%2C108%2C101%2C0",
            );
        });

        it("should return the signature request from the last signing token", async () => {
            const provider = new JavascriptTestingProvider({ tenant: "testnet" });
            const pending = provider.requestTransactionSignature({ transaction: {} as Transaction });
            respond(signingTokens());
            await pending;

            await expect(provider.getSignatureRequest()).resolves.toEqual({
                user: { userId: "google|1" },
                signatureRequest: {
                    guardId: "jwt#https://tenant.example.com/",
                    verifyPayload: jwt({ fatxn: [9, 8, 7] }),
                    signPayload: [9, 8, 7],
                },
            });
        });

        const loggedIn = async () => {
            const provider = new JavascriptTestingProvider({ tenant: "testnet" });
            const login = provider.login();
            respond(tokens());
            await login;
            return provider;
        };

        it("should reject a signing approval by another user and keep the signed in user", async () => {
            const provider = await loggedIn();
            const pending = provider.requestTransactionSignature({ transaction: {} as Transaction });
            respond(signingTokens([9, 8, 7], { id_token: jwt({ sub: "google|2", exp: 2_000_000_000 }) }));

            await expect(pending).rejects.toThrow(JavascriptProviderErrorCodes.SIGNING_USER_MISMATCH);
            expect(await provider.getPath()).toBe("jwt#https://tenant.example.com/#google|1");
            await expect(provider.getSignatureRequest()).rejects.toThrow(JavascriptProviderErrorCodes.SIGNATURE_REQUEST_NOT_FOUND);
        });

        it("should accept a signing approval by the signed in user", async () => {
            const provider = await loggedIn();
            const pending = provider.requestTransactionSignature({ transaction: {} as Transaction });
            respond(signingTokens());

            await expect(pending).resolves.toEqual({ userId: "google|1" });
            expect((await provider.getSignatureRequest()).signatureRequest.signPayload).toEqual([9, 8, 7]);
        });

        it("should forget the signature request on logout", async () => {
            const provider = new JavascriptTestingProvider({ tenant: "testnet" });
            const pending = provider.requestTransactionSignature({ transaction: {} as Transaction });
            respond(signingTokens());
            await pending;

            await provider.logout();
            await expect(provider.getSignatureRequest()).rejects.toThrow(JavascriptProviderErrorCodes.SIGNATURE_REQUEST_NOT_FOUND);
        });

        it.each([
            ["a different payload", { access_token: jwt({ fatxn: [1, 2, 3] }) }],
            ["no payload", { access_token: jwt({ sub: "google|1" }) }],
            ["no access token", {}],
            ["an access token that is not a token", { access_token: "garbage" }],
        ])("should reject an approval that carries %s", async (_name, overrides) => {
            const provider = new JavascriptTestingProvider({ tenant: "testnet" });
            const pending = provider.requestTransactionSignature({ transaction: {} as Transaction });
            respond(tokens(overrides));

            await expect(pending).rejects.toThrow(JavascriptProviderErrorCodes.SIGNING_PAYLOAD_MISMATCH);
            await expect(provider.getSignatureRequest()).rejects.toThrow(JavascriptProviderErrorCodes.SIGNATURE_REQUEST_NOT_FOUND);
        });

        it("should forget the previous signature request when the next request fails", async () => {
            const provider = new JavascriptTestingProvider({ tenant: "testnet" });
            const first = provider.requestTransactionSignature({ transaction: {} as Transaction });
            respond(signingTokens());
            await first;

            const second = provider.requestTransactionSignature({ transaction: {} as Transaction });
            popup.closed = true;
            jest.advanceTimersByTime(500);

            await expect(second).rejects.toThrow(JavascriptProviderErrorCodes.POPUP_CLOSED);
            await expect(provider.getSignatureRequest()).rejects.toThrow(JavascriptProviderErrorCodes.SIGNATURE_REQUEST_NOT_FOUND);
        });

        it("should have no signature request before a signing approval", async () => {
            await expect(new JavascriptTestingProvider({ tenant: "testnet" }).getSignatureRequest()).rejects.toThrow(
                JavascriptProviderErrorCodes.SIGNATURE_REQUEST_NOT_FOUND,
            );
        });
    });
});
