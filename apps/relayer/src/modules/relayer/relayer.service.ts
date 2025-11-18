import { Inject, Injectable, Logger } from "@nestjs/common";
import { SignRequest } from "./requests/sign.request";
import { createTransaction, functionCall, SCHEMA, Action, Signature } from "near-api-js/lib/transaction";
import {actionCreators, buildDelegateAction, DelegateAction} from "@near-js/transactions";
import { parseNearAmount } from "near-api-js/lib/utils/format";
import {base_decode} from "near-api-js/lib/utils/serialize";
import { NearSignerService } from "../near/near-signer.service";
import { NearClientService } from "../near/near-client.service";
import { ConfigService } from "@nestjs/config";
import { FastAuthRelayerMetricsProvider } from "./relayer.metrics";
import {PublicKey, serialize} from "near-api-js/lib/utils";
import { SignResponse } from "./response/sign.response";
import { SignAndSendDelegateActionRequest } from "./requests/sign-and-send-delegate-action.request";
import { CreateAccountRequest } from "./requests/create-account.request";
import {CreateAccountAtomicRequest} from "./requests/create-account-atomic.request";

@Injectable()
export class RelayerService {
    private readonly logger: Logger;
    private readonly fastAuthContractId: string;
    private readonly mpcContractId: string;
    private readonly accountContractId: string;

    constructor(
        @Inject(NearSignerService) private readonly signerService: NearSignerService,
        @Inject(NearClientService) private readonly clientService: NearClientService,
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(FastAuthRelayerMetricsProvider) private readonly fastAuthRelayerMetricsProvider: FastAuthRelayerMetricsProvider,
    ) {
        this.logger = new Logger(RelayerService.name);
        this.fastAuthContractId = this.configService.get("near.fastAuthContractId") as string;
        this.mpcContractId = this.configService.get("near.mpcContractId") as string;
        this.accountContractId = this.configService.get("near.accountContractId") as string;
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
                BigInt(parseNearAmount("0")!),
            ),
        ]);
    }

    /**
     * Sign and sends a delegate action.
     * @param body The sign and send delegate action request.
     * @returns The sign response.
     */
    async signAndSendDelegateAction(body: SignAndSendDelegateActionRequest): Promise<SignResponse> {
        const delegateAction = serialize.deserialize(SCHEMA.DelegateAction, Uint8Array.from(body.sign_payload), true) as DelegateAction;
        const { result } = await this.signFastAuthRequest(body);
        const payload = JSON.parse(Buffer.from((result.status as any)?.SuccessValue, "base64").toString());
        const signature = new Signature({
            keyType: payload.scheme,
            data: new Uint8Array(payload.signature),
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
        const publicKey = (await this.clientService.viewFunction(this.mpcContractId, "derived_public_key", {
            path: `jwt#https://login.fast-auth.com/#${body.sub}`,
            predecessor: this.fastAuthContractId,
            domain_id: 1,
        })) as string;
        return this.signAndSendTransaction(this.accountContractId, [
            functionCall(
                "create_account",
                { new_public_key: publicKey, new_account_id: body.account_id },
                300000000000000n,
                BigInt(parseNearAmount("0")!),
            ),
        ]);
    }

    async createAccountAtomic(body: CreateAccountAtomicRequest): Promise<SignResponse> {
        const functionCallAction = body.signed_delegate_action.delegate_action.actions[0].FunctionCall;
        const [sigAlgo, sigData] = body.signed_delegate_action.signature.split(":")
        const signedDelegate = actionCreators.signedDelegate({
            delegateAction: buildDelegateAction({
                senderId: body.signed_delegate_action.delegate_action.sender_id,
                receiverId: body.signed_delegate_action.delegate_action.receiver_id,
                actions: [
                    functionCall(
                        functionCallAction.method_name,
                        JSON.parse(Buffer.from(functionCallAction.args, "base64").toString()),
                        functionCallAction.gas,
                        functionCallAction.deposit,
                    )
                ],
                nonce: body.signed_delegate_action.delegate_action.nonce,
                maxBlockHeight: body.signed_delegate_action.delegate_action.max_block_height,
                publicKey: PublicKey.from(body.signed_delegate_action.delegate_action.public_key),
            }),
            signature: new Signature({
                keyType: sigAlgo === "ed25519" ? 0 : 1,
                data: base_decode(sigData),
                // 245, 37, 132, 230, ... 63, 170, 6
            }),
        });
        return await this.signAndSendTransaction(body.signed_delegate_action.delegate_action.sender_id, [signedDelegate]);
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
