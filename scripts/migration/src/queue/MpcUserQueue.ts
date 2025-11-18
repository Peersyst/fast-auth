import Bull from "bull";
import { PublicKey } from "near-api-js/lib/utils/key_pair";
import { AddAccessKeysQueue } from "./AddAccessKeysQueue";
import { firebaseIdFromInternalAccountId, firebaseProviderToAuth0Provider } from "../utils/firebase";
import { MpcUser } from "../database/MpcDatabase";
import { FirebaseDatabase } from "../database/FirebaseDatabase";
import { FastAuthProvider } from "../provider/FastAuthProvider";
import { Queue } from "./Queue";
import { MPCProvider } from "../provider/MPCProvider";
import { SignJWT } from "jose";
import { createPrivateKey } from "node:crypto";

export const QUEUE_NAME = "mpc-user-queue";

export type JobParams = {
    user: MpcUser;
};

export class MpcUserQueue extends Queue<JobParams> {
    constructor(
        config: Bull.QueueOptions,
        private readonly mpcProvider: MPCProvider,
        private readonly addAccessKeysQueue: AddAccessKeysQueue,
        private readonly firebaseDatabase: FirebaseDatabase,
        private readonly fastAuthProvider: FastAuthProvider,
        private readonly privateKeyPem: string,
    ) {
        super(QUEUE_NAME, config);
    }

    /**
     *
     * @param s
     */
    normalizePem(s: string) {
        return (s ?? "").replace(/\\n/g, "\n").trim();
    }

    /**
     *
     * @param job
     */
    async _process(job: Bull.Job<JobParams>): Promise<void> {
        const pk = createPrivateKey({ key: this.normalizePem(this.privateKeyPem), format: "pem", type: "pkcs1" });
        const [issP1, issP2, sub] = job.data.user.internal_account_id.split(":");
        const issP2Parts = issP2.split("/");
        const aud = issP2Parts[issP2Parts.length - 1];
        const jwt = await new SignJWT({ iss: `${issP1}:${issP2}`, sub, aud })
            .setProtectedHeader({ alg: "RS256", kid: "migration-key" })
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(pk);

        await this.mpcProvider.claimOidcToken(jwt);
        const userCredentials = await this.mpcProvider.userCredentials(jwt);
        const oldPublicKey = PublicKey.fromString(userCredentials.recovery_pk);

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

        await this.addAccessKeysQueue.add({ oldPublicKey: oldPublicKey.toString(), newPublicKeys, jwt });
    }
}
