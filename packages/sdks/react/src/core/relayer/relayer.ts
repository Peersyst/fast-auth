import {
    RelayCreateAccountRequest,
    RelayCreateAccountResponse,
    RelayDelegateActionSignatureRequest,
    RelayDelegateActionSignatureResponse,
    RelayTransactionSignatureRequest,
    RelayTransactionSignatureResponse,
} from "./types";

export class FastAuthRelayer {
    private readonly url: string;

    constructor(url: string) {
        this.url = url;
    }

    /**
     * Relay a sign action.
     * @param request The request to relay.
     * @returns The result of the relay.
     */
    async relayTransactionSignatureRequest(request: RelayTransactionSignatureRequest): Promise<RelayTransactionSignatureResponse> {
        const response = await fetch(`${this.url}/sign-tx`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                guard_id: request.guardId,
                verify_payload: request.verifyPayload,
                sign_payload: request.signPayload,
                algorithm: request.algorithm,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to relay sign action: ${response.statusText}`);
        }

        const result = await response.json();
        return {
            hash: result.hash,
            result: result.result,
        };
    }

    /**
     * Relay a delegate action signature request.
     * @param request The request to relay.
     * @returns The result of the relay.
     */
    async relayDelegateActionSignatureRequest(request: RelayDelegateActionSignatureRequest): Promise<RelayDelegateActionSignatureResponse> {
        const response = await fetch(`${this.url}/sign-delegate-tx`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                guard_id: request.guardId,
                verify_payload: request.verifyPayload,
                sign_payload: request.signPayload,
                algorithm: request.algorithm,
                receiver_id: request.receiverId,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to relay delegate action signature request: ${response.statusText}`);
        }

        const result = await response.json();
        return {
            hash: result.hash,
            result: result.result,
        };
    }

    /**
     * Relay a create account action.
     * @param payload The payload to relay.
     * @returns The result of the relay.
     */
    async relayCreateAccount(payload: RelayCreateAccountRequest): Promise<RelayCreateAccountResponse> {
        const response = await fetch(`${this.url}/create-account`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to relay create account action: ${response.statusText}`);
        }

        const result = await response.json();
        return {
            hash: result.hash,
            result: result.result,
        };
    }
}
