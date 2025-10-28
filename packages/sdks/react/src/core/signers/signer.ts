import { Action, functionCall, Signature, SignedTransaction, Transaction } from "near-api-js/lib/transaction";
import {
    CreateAccountOptions,
    CreateSignActionOptions,
    FastAuthSignerOptions,
    SignAndSendDelegateActionOptions,
    SignAndSendTransactionOptions,
    SignatureRequest,
} from "./signer.types";
import { IFastAuthProvider } from "./providers/fast-auth.provider";
import { Connection } from "near-api-js";
import { CodeResult, FinalExecutionOutcome } from "near-api-js/lib/providers/provider";
import { ViewFunctionCallOptions } from "@near-js/accounts";
import { PublicKey } from "near-api-js/lib/utils";
import { FastAuthSignature } from "../common/signature/signature";
import { FastAuthSignerError } from "./signer.errors";
import { FastAuthSignerErrorCodes } from "./signer.error-codes";
import { Algorithm } from "../common/signature/types";
import { getDomainIdOrFail } from "./utils";
import { getKeyTypeOrFail } from "./utils";
import { FastAuthRelayer } from "../relayer";

export class FastAuthSigner<P extends IFastAuthProvider = IFastAuthProvider> {
    private path: string;
    private readonly relayer: FastAuthRelayer;

    constructor(
        private readonly fastAuthProvider: P,
        private readonly connection: Connection,
        private readonly options: FastAuthSignerOptions,
        relayerURL: string,
    ) {
        this.relayer = new FastAuthRelayer(relayerURL);
    }

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
     * @param options The options for the view function.
     * @returns The result of the view function.
     */
    private async viewFunction(options: ViewFunctionCallOptions) {
        const { contractId, methodName, args, blockQuery } = options;
        this.validateArgs(args);

        const encodedArgs = Buffer.from(JSON.stringify(args));

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

    /**
     * Initialize the signer.
     */
    async init() {
        this.path = await this.fastAuthProvider.getPath();
    }

    /**
     * Create a new account.
     * @param accountId The ID of the account to create.
     * @param options The options for the account creation.
     * @returns The action to create the account.
     */
    async createAccount(accountId: string, options?: CreateAccountOptions): Promise<string> {
        const { algorithm = "ed25519" } = options ?? {};
        const publicKey = await this.getPublicKey(algorithm);
        // return functionCall(
        //     "create_account",
        //     {
        //         new_public_key: publicKey.toString(),
        //         new_account_id: accountId,
        //     },
        //     gas,
        //     deposit,
        // );
        const { hash } = await this.relayer.relayCreateAccount({
            accountId,
            publicKey: publicKey.toString(),
        });
        return hash;
    }

    /**
     * Request a signature from the user.
     * Appends the app options to the last parameter.
     * @param args The arguments to request a signature.
     * @returns The signed transaction.
     */
    async requestTransactionSignature(...args: Parameters<P["requestTransactionSignature"]>) {
        return await this.fastAuthProvider.requestTransactionSignature(...args);
    }

    /**
     * Request a delegate action signature from the user.
     * Appends the app options to the last parameter.
     * @param args The arguments to request a delegate action signature.
     * @returns The signed delegate action.
     */
    async requestDelegateActionSignature(...args: Parameters<P["requestDelegateActionSignature"]>) {
        return await this.fastAuthProvider.requestDelegateActionSignature(...args);
    }

    /**
     * Sign a transaction and relay it to the network.
     * @param opts The options for the sign and send transaction.
     * @returns The signed transaction.
     */
    async signAndSendTransaction(opts: SignAndSendTransactionOptions<P>): Promise<FinalExecutionOutcome> {
        const { algorithm: algorithmParam = "eddsa", transaction } = opts;
        // Call the fast auth provider to sign a transaction.
        await this.fastAuthProvider.requestTransactionSignature(opts);

        const signatureRequest = await this.getSignatureRequest();

        const { result } = await this.relayer.relayTransactionSignatureRequest({ ...signatureRequest, algorithm: algorithmParam });

        if (typeof result.status !== "object" || !("SuccessValue" in result.status)) {
            throw new Error("Failed to sign delegate action");
        }
        const signature = FastAuthSignature.fromBase64(result.status.SuccessValue!);

        const algorithm = algorithmParam !== "eddsa" ? "secp256k1" : "ed25519";
        return await this.sendTransaction(transaction, signature, algorithm);
    }

    /**
     * Sign a delegate action and relay it to the network.
     * @param opts The options for the sign and send delegate action.
     * @returns The signed delegate action.
     */
    async signAndSendDelegateAction(opts: SignAndSendDelegateActionOptions<P>): Promise<FinalExecutionOutcome> {
        const { receiverId, algorithm = "eddsa" } = opts;
        // Call the fast auth provider to sign a delegate action.
        await this.fastAuthProvider.requestDelegateActionSignature(opts);

        const signatureRequest = await this.getSignatureRequest();

        const { result } = await this.relayer.relayDelegateActionSignatureRequest({ ...signatureRequest, receiverId, algorithm });
        return result;
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
     * @param options The options for the sign action.
     * @returns The signed message.
     */
    async createSignAction(request: SignatureRequest, options?: CreateSignActionOptions): Promise<Action> {
        const { gas = 300000000000000n, deposit = 0n } = options ?? {};
        const { guardId, verifyPayload, signPayload, algorithm = "eddsa" } = request;

        return functionCall(
            "sign",
            {
                guard_id: guardId,
                verify_payload: verifyPayload,
                sign_payload: signPayload,
                algorithm: algorithm,
            },
            gas,
            deposit,
        );
    }

    /**
     * Sign a message and send it to the network.
     * @param transaction The transaction to sign.
     * @param signature The signature to use.
     * @param algorithm The algorithm to use (default: ed25519).
     * @returns The provider result.
     */
    async sendTransaction(transaction: Transaction, signature: FastAuthSignature, algorithm: Algorithm = "ed25519") {
        const sig = signature.recover(algorithm);
        const signedTransaction = new SignedTransaction({
            transaction: transaction,
            signature: new Signature({
                keyType: getKeyTypeOrFail(algorithm),
                data: sig,
            }),
        });

        return await this.connection.provider.sendTransaction(signedTransaction);
    }

    /**
     * Get the public key of the account.
     * @param algorithm The algorithm to use (default: ed25519).
     * @returns The public key.
     */
    async getPublicKey(algorithm: Algorithm = "ed25519"): Promise<PublicKey> {
        // Call the fast auth contract with the path
        const publicKey = await this.viewFunction({
            contractId: this.options.mpcContractId,
            methodName: "derived_public_key",
            args: { path: this.path, predecessor: this.options.fastAuthContractId, domain_id: getDomainIdOrFail(algorithm) },
        });

        return publicKey;
    }
}
