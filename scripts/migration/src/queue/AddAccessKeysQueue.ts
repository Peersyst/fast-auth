import Bull from "bull";
import { buildDelegateAction } from "@near-js/transactions";
import { NearProvider } from "../provider/NearProvider";
import { addKey, fullAccessKey } from "near-api-js/lib/transaction";
import { PublicKey } from "near-api-js/lib/utils/key_pair";
import { SignQueue } from "./SignQueue";
import { Queue } from "./Queue";

export const QUEUE_NAME = "add-access-keys-queue";

export type JobParams = {
    oldPublicKey: string;
    newPublicKeys: string[];
};

export class AddAccessKeysQueue extends Queue<JobParams> {
    constructor(
        config: Bull.QueueOptions,
        private readonly signQueue: SignQueue,
        private readonly nearProvider: NearProvider,
    ) {
        super(QUEUE_NAME, config);
    }

    /**
     *
     * @param job
     */
    async _process(job: Bull.Job<JobParams>): Promise<void> {
        // For each account retrieve its implicit account and the list of account ids where this pubkey has full access
        const accounts = await this.nearProvider.getAccountIdsByPublicKey(job.data.oldPublicKey);
        accounts.push(this.nearProvider.implicitAccount(job.data.oldPublicKey));
        // For each account the public key has
        for (const account of accounts) {
            let startNonce = await this.nearProvider.getAccountNonce(account, job.data.oldPublicKey);
            for (const newPublicKey of job.data.newPublicKeys) {
                const hasFullAccess = await this.nearProvider.hasFullAccessKey(account, newPublicKey);
                if (hasFullAccess) {
                    this.log(`skipping account ${account}: already has full access key ${newPublicKey}`, "warn");
                    return;
                }
                // Sign a transaction for adding the newPublicKey
                const delegateAction = buildDelegateAction({
                    senderId: account,
                    receiverId: account,
                    nonce: startNonce++,
                    actions: [addKey(newPublicKey, fullAccessKey())],
                    publicKey: PublicKey.from(job.data.oldPublicKey),
                    maxBlockHeight: await this.nearProvider.getMaxBlockHeight(),
                });
                await this.signQueue.add({ delegateAction });
            }
        }
    }
}
