import { Action, functionCall } from "near-api-js/lib/transaction";
import { INearApiProvider } from "./providers/near-api.provider";
import { CreateAccountOptions, SignatureRequest } from "./signer.types";
import { IFastAuthProvider } from "./providers/fast-auth.provider";
import { Connection } from "near-api-js";
import { FAST_AUTH_CONTRACT_ID } from "./signer.constants";
import { viewFunction } from "@near-js/accounts/lib/utils";

export class FastAuthSigner<O = Record<string, never>, SR extends SignatureRequest = SignatureRequest> {
    constructor(
        private readonly nearProvider: INearApiProvider,
        private readonly fastAuthProvider: IFastAuthProvider<O, SR>,
        private readonly path: string,
    ) {}

    /**
     * Create a new account.
     * @param accountId The ID of the account to create.
     * @param options The options for the account creation.
     * @returns The action to create the account.
     */
    createAccount(accountId: string, { gas, deposit }: CreateAccountOptions): Action {
        return functionCall(
            "create_account",
            {
                new_public_key: "",
                new_account_id: accountId,
            },
            gas ?? 300000000000000n,
            deposit ?? 0n,
        );
    }

    /**
     * Request a signature from the user.
     * @param options The options for the request signature.
     * @returns The signed transaction.
     */
    async requestSignature(options: O) {
        // Call the fast auth provider to request a signature.
        return await this.fastAuthProvider.requestSignature(options);
    }

    /**
     * Get a signature request.
     * @returns The signature request.
     */
    getSignatureRequest(): SR {
        // Retrieve the signature request from the fast auth provider.
        return this.fastAuthProvider.getSignatureRequest();
    }

    /**
     * Sign a message.
     * @param request The request to sign.
     * @returns The signed message.
     */
    sign(request: SR): Action {
        // Call the fast auth contract with the path
        return functionCall(
            "sign",
            {
                guard_id: request.guardId,
                verify_payload: request.verifyPayload,
                sign_payload: request.signPayload,
            },
            300000000000000n,
            0n,
        );
    }

    /**
     * Sign a message and send it to the network.
     */
    signAndSend() {}

    /**
     * Get the public key of the account.
     * @param connection The connection to the network.
     * @returns The public key.
     */
    async getPublicKey(connection: Connection) {
        // Call the fast auth contract with the path
        const publicKey = await viewFunction({
            contractId: "v1.signer-prod.testnet",
            methodName: "derived_public_key",
            args: { path: this.path, predecessor: FAST_AUTH_CONTRACT_ID },
        });
        return publicKey;
    }
}
