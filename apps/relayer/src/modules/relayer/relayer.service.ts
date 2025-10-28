import { Inject, Injectable, Logger } from "@nestjs/common";
import { SignRequest } from "./requests/sign.request";
import { createTransaction, functionCall, SCHEMA, Action, Signature } from "near-api-js/lib/transaction";
import { actionCreators, DelegateAction } from "@near-js/transactions";
import { parseNearAmount } from "near-api-js/lib/utils/format";
import { base_decode } from "near-api-js/lib/utils/serialize";
import { NearSignerService } from "../near/near-signer.service";
import { NearClientService } from "../near/near-client.service";
import { ConfigService } from "@nestjs/config";
import { FastAuthRelayerMetricsProvider } from "./relayer.metrics";
import { SignResponse } from "./response/sign.response";
import { SignAndSendDelegateActionRequest } from "./requests/sign-and-send-delegate-action.request";
import { CreateAccountRequest } from "./requests/create-account.request";
import { FastAuthSignature } from "../common/signature";
import { getKeyTypeOrFail } from "../common/signature/utils/key-type";
import { deserialize } from "borsh";

@Injectable()
export class RelayerService {
    private readonly logger: Logger;
    private readonly fastAuthContractId: string;
    private readonly accountContractId: string;
    private readonly mpcDepositAmount: bigint;
    constructor(
        @Inject(NearSignerService) private readonly signerService: NearSignerService,
        @Inject(NearClientService) private readonly clientService: NearClientService,
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(FastAuthRelayerMetricsProvider) private readonly fastAuthRelayerMetricsProvider: FastAuthRelayerMetricsProvider,
    ) {
        this.logger = new Logger(RelayerService.name);
        this.fastAuthContractId = this.configService.get("near.fastAuthContractId") as string;
        this.accountContractId = this.configService.get("near.accountContractId") as string;
        this.mpcDepositAmount = this.configService.get("near.mpcDepositAmount") as bigint;
    }

    /**
     * Gets a signer nonce.
     * @param address The address of the signer.
     * @param publicKey The public key of the signer.
     * @returns The nonce.
     */
    private async getSignerNonce(address: string, publicKey: string): Promise<number> {
        const accessKey = await this.clientService.queryAccessKey(address, publicKey);
        return Number(accessKey.nonce) + 1;
    }

    /**
     * Signs a fast auth request.
     * @param body The body of the request.
     * @returns The transaction hash.
     */
    async signFastAuthRequest(body: SignRequest): Promise<SignResponse> {
        return this.signAndSendTransaction(this.fastAuthContractId, [
            functionCall(
                "sign",
                {
                    guard_id: body.guard_id,
                    sign_payload: body.sign_payload,
                    verify_payload: body.verify_payload,
                    algorithm: body.algorithm,
                },
                300000000000000n,
                this.mpcDepositAmount,
            ),
        ]);
    }

    /**
     * Sign and sends a delegate action.
     * @param body The sign and send delegate action request.
     * @returns The sign response.
     */
    async signAndSendDelegateAction(body: SignAndSendDelegateActionRequest): Promise<SignResponse> {
        const encodedDelegateAction = Uint8Array.from(body.sign_payload);

        // Try to deserialize the DelegateAction
        // Some encodings may have a 4-byte prefix (DelegateActionPrefix), so we handle both cases
        let delegateAction: DelegateAction;
        try {
            // First, try without prefix
            delegateAction = deserialize(SCHEMA.DelegateAction, encodedDelegateAction) as DelegateAction;
        } catch (error) {
            // If that fails, try skipping the first 4 bytes (prefix)
            if (encodedDelegateAction.length > 4) {
                const delegateActionBytes = encodedDelegateAction.slice(4);
                delegateAction = deserialize(SCHEMA.DelegateAction, delegateActionBytes) as DelegateAction;
            } else {
                throw error;
            }
        }

        const { result } = await this.signFastAuthRequest(body);

        const fsSignature = FastAuthSignature.fromBase64(result.status.SuccessValue as string);
        const algorithm = body.algorithm === "eddsa" ? "ed25519" : "secp256k1";
        const signature = new Signature({
            keyType: getKeyTypeOrFail(algorithm),
            data: fsSignature.recover(),
        });
        const signedDelegate = actionCreators.signedDelegate({
            delegateAction,
            signature,
        });
        return await this.signAndSendTransaction(body.receiver_id, [signedDelegate]);
    }

    /**
     * Sign and sends a delegate action.
     * @param body The sign and send delegate action request.
     * @returns The sign response.
     */
    async createAccount(body: CreateAccountRequest): Promise<SignResponse> {
        return this.signAndSendTransaction(this.accountContractId, [
            functionCall(
                "create_account",
                { new_public_key: body.publicKey, new_account_id: body.accountId },
                300000000000000n,
                BigInt(parseNearAmount("0")!),
            ),
        ]);
    }

    /**
     * Sign and sends a transaction using a signer.
     * @param receiverId The receiver id of the transaction.
     * @param actions The actions of the transaction.
     * @returns The sign response.
     */
    private async signAndSendTransaction(receiverId: string, actions: Action[]): Promise<SignResponse> {
        const signer = await this.signerService.requestSigner();
        let nonce: number | undefined;

        try {
            const sender = signer.getAddress();
            const senderPublicKey = signer.getPublicKey();
            const senderPublicKeyString = senderPublicKey.toString();

            // Do not use Promise.all to ensure client service updates recent hash only once
            nonce = await this.getSignerNonce(sender, senderPublicKeyString);
            const recentBlockHash = await this.clientService.getRecentBlockHash();

            const tx = createTransaction(sender, senderPublicKey, receiverId, nonce, actions, base_decode(recentBlockHash));

            const { signedTransaction, hash } = signer.signTransaction(tx);

            this.logger.log(`Sending transaction ${hash}`);
            const result = await this.clientService.sendTransaction(signedTransaction);

            this.fastAuthRelayerMetricsProvider.sign();
            this.logger.log(`Sign to ${receiverId} done with hash ${hash}`);

            await this.signerService.releaseSigner(signer);

            return { hash, result };
        } catch (error) {
            this.fastAuthRelayerMetricsProvider.signFailed();

            this.logger.error(`Error doing a sign request to ${receiverId}: ${error}`);

            await this.signerService.releaseSigner(signer);

            throw error;
        }
    }
}
