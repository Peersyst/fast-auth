import { Inject, Injectable, Logger } from "@nestjs/common";
import { SignRequest } from "./requests/sign.request";
import { createTransaction, functionCall } from "near-api-js/lib/transaction";
import { parseNearAmount } from "near-api-js/lib/utils/format";
import { base_decode } from "near-api-js/lib/utils/serialize";
import { NearSignerService } from "../near/near-signer.service";
import { NearClientService } from "../near/near-client.service";
import { ConfigService } from "@nestjs/config";
import { FastAuthRelayerMetricsProvider } from "./relayer.metrics";

@Injectable()
export class RelayerService {
    private readonly logger: Logger;
    private readonly fastAuthContractId: string;

    constructor(
        @Inject(NearSignerService) private readonly signerService: NearSignerService,
        @Inject(NearClientService) private readonly clientService: NearClientService,
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(FastAuthRelayerMetricsProvider) private readonly fastAuthRelayerMetricsProvider: FastAuthRelayerMetricsProvider,
    ) {
        this.logger = new Logger(RelayerService.name);
        this.fastAuthContractId = this.configService.get("near.fastAuthContractId") as string;
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
    async sign(body: SignRequest): Promise<string> {
        const signer = await this.signerService.requestSigner();
        let nonce: number | undefined;

        try {
            const sender = signer.getAddress();
            const senderPublicKey = signer.getPublicKey();
            const senderPublicKeyString = senderPublicKey.toString();

            // Do not use Promise.all to ensure client service updates recent hash only once
            nonce = await this.getSignerNonce(sender, senderPublicKeyString);
            const recentBlockHash = await this.clientService.getRecentBlockHash();

            const tx = createTransaction(
                sender,
                senderPublicKey,
                this.fastAuthContractId,
                nonce,
                [
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
                ],
                base_decode(recentBlockHash),
            );

            const { signedTransaction, hash } = signer.signTransaction(tx);

            this.logger.log(`Sending transaction ${hash}`);
            await this.clientService.sendTransaction(signedTransaction);

            this.fastAuthRelayerMetricsProvider.sign();
            this.logger.log(`Sign ${body.guard_id} done with hash ${hash}`);

            await this.signerService.releaseSigner(signer);

            return hash;
        } catch (error) {
            this.fastAuthRelayerMetricsProvider.signFailed();

            this.logger.error(`Error doing a sign request ${body.sign_payload}: ${error}`);

            await this.signerService.releaseSigner(signer);

            throw error;
        }
    }
}
