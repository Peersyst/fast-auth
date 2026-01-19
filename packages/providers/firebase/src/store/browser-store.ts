import { SignatureRequest } from "../core";
import { Store } from "./store";

export class BrowserStore implements Store {
    /**
     * Get the signature request from local storage.
     * @returns The signature request.
     */
    getSignatureRequest(): SignatureRequest | null {
        const signatureRequestJson = localStorage.getItem("fast-auth-signature-request");
        if (signatureRequestJson) {
            try {
                const { guardId, verifyPayload, signPayload, algorithm } = JSON.parse(signatureRequestJson);
                return {
                    guardId,
                    verifyPayload,
                    signPayload: new Uint8Array(Buffer.from(signPayload, "base64")),
                    algorithm,
                };
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn("Failed to parse signature request from JSON:", error);
                return null;
            }
        }
        return null;
    }
    /**
     * Set the signature request in local storage.
     * @param signatureRequest The signature request to set.
     */
    setSignatureRequest(signatureRequest: SignatureRequest): void {
        localStorage.setItem(
            "fast-auth-signature-request",
            JSON.stringify({
                guardId: signatureRequest.guardId,
                verifyPayload: signatureRequest.verifyPayload,
                signPayload: Buffer.from(signatureRequest.signPayload).toString("base64"),
                algorithm: signatureRequest.algorithm,
            }),
        );
    }
    /**
     * Clear the signature request from local storage.
     */
    clear(): void {
        localStorage.removeItem("fast-auth-keypair");
    }
}
