import { RelayCreateAccountRequest, RelayCreateAccountResponse, RelaySignatureRequest, RelaySignatureResponse } from "./types";

export class FastAuthRelayer {
    private readonly url: string;
    
    constructor(url: string) {
        this.url = url;
    }

    /**
     * Relay a sign action.
     * @param action The action to relay.
     * @returns The result of the relay.
     */
    async relaySignatureRequest(signatureRequest: RelaySignatureRequest): Promise<RelaySignatureResponse> {
        const response = await fetch(`${this.url}/sign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(signatureRequest),
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
     * Relay a create account action.
     * @param action The action to relay.
     * @returns The result of the relay.
     */
    async relayCreateAccount(payload: RelayCreateAccountRequest): Promise<RelayCreateAccountResponse> {
        const response = await fetch(`${this.url}/create-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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