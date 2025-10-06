import { Action, functionCall, Signature, SignedTransaction, Transaction } from "near-api-js/lib/transaction";
import { CreateAccountOptions, FastAuthSignerOptions, SignatureRequest } from "./signer.types";
import { KeyType } from "near-api-js/lib/utils/key_pair";
import { IFastAuthProvider } from "./providers/fast-auth.provider";
import { Connection } from "near-api-js";
import { CodeResult } from "near-api-js/lib/providers/provider";
import { bytesJsonStringify } from "./utils";
import { ViewFunctionCallOptions } from "@near-js/accounts";
import { PublicKey } from "near-api-js/lib/utils";
import { parseNearAmount } from "near-api-js/lib/utils/format";
import { FastAuthSignature } from "../common/signature/signature";
import { FastAuthSignerError } from "./signer.errors";
import { FastAuthSignerErrorCodes } from "./signer.error-codes";

export class FastAuthSigner<P extends IFastAuthProvider = IFastAuthProvider> {
    private path: string;
    constructor(
        private readonly fastAuthProvider: P,
        private readonly connection: Connection,
        private readonly options: FastAuthSignerOptions,
    ) {}

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
            throw new FastAuthSignerError(FastAuthSignerErrorCodes.INVALID_ARGUMENTS);
        }
    }

    /**
     * View a function.
     * @param connection The connection to the network.
     * @param options The options for the view function.
     * @returns The result of the view function.
     */
    private async viewFunction({ contractId, methodName, args, blockQuery }: ViewFunctionCallOptions) {
        this.validateArgs(args);

        const encodedArgs = bytesJsonStringify(args);

        const result = await this.connection.provider.query<CodeResult>({
            request_type: "call_function",
            ...blockQuery,
            account_id: contractId,
            method_name: methodName,
            args_base64: encodedArgs.toString("base64"),
            sync_checkpoint: "earliest_available",
        });

        return JSON.parse(Buffer.from(result.result).toString());
    }

    async init() {
        this.path = await this.fastAuthProvider.getPath();
    }

    /**
     * Create a new account.
     * @param accountId The ID of the account to create.
     * @param options The options for the account creation.
     * @returns The action to create the account.
     */
    async createAccount(accountId: string, options?: CreateAccountOptions): Promise<Action> {
        const { gas = 300000000000000n, deposit = 0n } = options ?? {};
        const publicKey = await this.getPublicKey();
        return functionCall(
            "create_account",
            {
                new_public_key: publicKey.toString(),
                new_account_id: accountId,
            },
            gas,
            deposit,
        );
    }

    /**
     * Request a signature from the user.
     * @param options The options for the request signature.
     * @returns The signed transaction.
     */
    async requestTransactionSignature(...args: Parameters<P["requestTransactionSignature"]>) {
        // Call the fast auth provider to request a signature.
        return await this.fastAuthProvider.requestTransactionSignature(...args);
    }

    /**
     * Request a delegate action signature from the user.
     * @param options The options for the request delegate action signature.
     * @returns The signed delegate action.
     */
    async requestDelegateActionSignature(...args: Parameters<P["requestDelegateActionSignature"]>) {
        // Call the fast auth provider to request a delegate action signature.
        return await this.fastAuthProvider.requestDelegateActionSignature(...args);
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
    async createSignAction(request: SignatureRequest): Promise<Action> {
        return functionCall(
            "sign",
            {
                guard_id: request.guardId,
                verify_payload: request.verifyPayload,
                sign_payload: request.signPayload,
                algorithm: "ecdsa",
            },
            300000000000000n,
            BigInt(parseNearAmount("1")!),
        );
    }

    /**
     * Sign a message and send it to the network.
     */
    async sendTransaction(transaction: Transaction, signature: FastAuthSignature) {
        const sig = signature.recover();
        const signedTransaction = new SignedTransaction({
            transaction: transaction,
            signature: new Signature({
                keyType: KeyType.SECP256K1,
                data: sig,
            }),
        });

        return await this.connection.provider.sendTransaction(signedTransaction);
    }

    /**
     * Get the public key of the account.
     * @param connection The connection to the network.
     * @returns The public key.
     */
    async getPublicKey(): Promise<PublicKey> {
        // Call the fast auth contract with the path
        const publicKey = await this.viewFunction({
            contractId: this.options.mpcContractId,
            methodName: "derived_public_key",
            args: { path: this.path, predecessor: this.options.fastAuthContractId },
        });

        return publicKey;
    }
}
