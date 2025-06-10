import { Action, functionCall } from "near-api-js/lib/transaction";
import { CreateAccountOptions, SignatureRequest } from "./signer.types";
import { IFastAuthProvider } from "./providers/fast-auth.provider";
import { Connection } from "near-api-js";
import { FAST_AUTH_CONTRACT_ID } from "./signer.constants";
import { CodeResult } from "near-api-js/lib/providers/provider";
import { bytesJsonStringify } from "./utils";
import { ViewFunctionCallOptions } from "@near-js/accounts";

export class FastAuthSigner<SR extends SignatureRequest = SignatureRequest> {
    private path: string;
    constructor(private readonly fastAuthProvider: IFastAuthProvider) {}

    /**
     * Validate the arguments.
     * @param args The arguments to validate.
     */
    private validateArgs(args: any) {
        const isUint8Array = args.byteLength !== undefined && args.byteLength === args.length;
        if (isUint8Array) {
            return;
        }

        if (Array.isArray(args) || typeof args !== "object") {
            throw new Error("Invalid arguments");
        }
    }

    /**
     * View a function.
     * @param connection The connection to the network.
     * @param options The options for the view function.
     * @returns The result of the view function.
     */
    private async viewFunction(connection: Connection, { contractId, methodName, args, blockQuery }: ViewFunctionCallOptions) {
        this.validateArgs(args);

        const encodedArgs = bytesJsonStringify(args);

        const result = await connection.provider.query<CodeResult>({
            request_type: "call_function",
            ...blockQuery,
            account_id: contractId,
            method_name: methodName,
            args_base64: encodedArgs.toString("base64"),
            sync_checkpoint: "earliest_available",
        });

        return Buffer.from(result.result);
    }

    async init() {
        this.path = await this.fastAuthProvider.getPath();
        console.log("path", this.path);
    }

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
    async requestSignature(options: any) {
        // Call the fast auth provider to request a signature.
        return await this.fastAuthProvider.requestTransactionSignature(options);
    }

    /**
     * Get a signature request.
     * @returns The signature request.
     */
    getSignatureRequest(): Promise<SignatureRequest> {
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
        const publicKey = await this.viewFunction(connection, {
            contractId: "v1.signer-prod.testnet",
            methodName: "derived_public_key",
            args: { path: this.path, predecessor: FAST_AUTH_CONTRACT_ID },
        });
        return publicKey;
    }
}
