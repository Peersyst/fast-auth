import { FirebaseProvider } from "../src/provider";
import { encodeDelegateAction } from "../src/utils";
import { actionCreators, buildDelegateAction } from "@near-js/transactions";
import { KeyPair } from "near-api-js";
import { SignatureRequest } from "../src/core";
import { Store } from "../src/store/store";

let mockAuthStateCallback: ((user: unknown) => void) | undefined;

jest.mock("firebase/app", () => ({ initializeApp: jest.fn(() => ({})) }));
jest.mock("firebase/auth", () => ({
    getAuth: jest.fn(() => ({
        onAuthStateChanged: (callback: (user: unknown) => void) => {
            mockAuthStateCallback = callback;
        },
        signOut: jest.fn(),
    })),
    GoogleAuthProvider: jest.fn(),
    OAuthProvider: jest.fn().mockImplementation(() => ({ addScope: jest.fn() })),
    signInWithPopup: jest.fn(),
}));

/** In-memory store, since the default one needs `localStorage`. */
class MemoryStore implements Store {
    private request: SignatureRequest | null = null;

    /**
     * Get the stored signature request.
     * @returns The signature request, or null.
     */
    getSignatureRequest(): SignatureRequest | null {
        return this.request;
    }

    /**
     * Store a signature request.
     * @param signatureRequest The signature request.
     */
    setSignatureRequest(signatureRequest: SignatureRequest): void {
        this.request = signatureRequest;
    }

    /** Drop the stored signature request. */
    clear(): void {
        this.request = null;
    }
}

const delegateAction = buildDelegateAction({
    senderId: "alice.near",
    receiverId: "bob.near",
    actions: [actionCreators.transfer(1n)],
    nonce: 1n,
    maxBlockHeight: 100n,
    publicKey: KeyPair.fromRandom("ed25519").getPublicKey(),
});

describe("FirebaseProvider", () => {
    it("requestDelegateActionSignature sends the delegate action to the issuer as JSON", async () => {
        const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ token: "issued-token" }) });
        global.fetch = fetchMock as unknown as typeof fetch;
        const provider = new FirebaseProvider({
            apiKey: "api-key",
            issuerUrl: "https://issuer.example/",
            customJwtIssuerUrl: "https://issuer.example/issue",
            store: new MemoryStore(),
        });
        mockAuthStateCallback?.({ getIdToken: async () => "firebase-id-token" });

        await provider.requestDelegateActionSignature({ delegateAction });

        const [, init] = fetchMock.mock.calls[0];
        expect(init.headers).toEqual({ "Content-Type": "application/json" });
        expect(JSON.parse(init.body)).toEqual({ jwt: "firebase-id-token", signPayload: encodeDelegateAction(delegateAction) });
    });
});
