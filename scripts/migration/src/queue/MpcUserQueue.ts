import Bull from "bull";
import { KeyType, PublicKey } from "near-api-js/lib/utils/key_pair";
import { AddAccessKeysQueue } from "./AddAccessKeysQueue";
import { firebaseIdFromInternalAccountId, firebaseProviderToAuth0Provider } from "../utils/firebase";
import { MpcUser } from "../database/MpcDatabase";
import { FirebaseDatabase } from "../database/FirebaseDatabase";
import { FastAuthProvider } from "../provider/FastAuthProvider";
import { Queue } from "./Queue";

export const QUEUE_NAME = "collect-users-queue";

export type JobParams = {
    user: MpcUser;
};

export class MpcUserQueue extends Queue<JobParams> {
    constructor(
        config: Bull.QueueOptions,
        private readonly addAccessKeysQueue: AddAccessKeysQueue,
        private readonly firebaseDatabase: FirebaseDatabase,
        private readonly fastAuthProvider: FastAuthProvider,
    ) {
        super(QUEUE_NAME, config);
    }

    /**
     *
     * @param job
     */
    async _process(job: Bull.Job<JobParams>): Promise<void> {
        const rawPublicKey = JSON.parse(job.data.user.public_key);
        const oldPublicKey = new PublicKey({
            keyType: rawPublicKey.curve === "ed25519" ? KeyType.ED25519 : KeyType.SECP256K1,
            data: new Uint8Array(rawPublicKey.point),
        });

        const firebaseUser = this.firebaseDatabase.findById(firebaseIdFromInternalAccountId(job.data.user.internal_account_id));

        // Retrieve new public key
        const newPublicKeys: PublicKey[] = [];
        for (const provider of firebaseUser.providerUserInfo) {
            const providerPublicKey = await this.fastAuthProvider.getPublicKey(
                firebaseProviderToAuth0Provider(provider.providerId),
                provider.rawId,
            );
            newPublicKeys.push(providerPublicKey);
        }

        await this.addAccessKeysQueue.add({ oldPublicKey: oldPublicKey.toString(), newPublicKeys });
    }
}
