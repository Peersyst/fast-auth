import Bull from "bull";
import { PublicKey } from "near-api-js/lib/utils/key_pair";
import { AddAccessKeysQueue } from "./AddAccessKeysQueue";
import { firebaseProviderToAuth0Provider } from "../utils/firebase";
import { FastAuthProvider } from "../provider/FastAuthProvider";
import { Queue } from "./Queue";
import { MPCProvider } from "../provider/MPCProvider";
import { SignJWT } from "jose";
import { createPrivateKey } from "node:crypto";
import { FirebaseUser } from "../database/IFirebaseDatabase";

export const QUEUE_NAME = "mpc-user-queue";

export type JobParams = {
    user: FirebaseUser;
};

export class MpcUserQueue extends Queue<JobParams> {
    constructor(
        config: Bull.QueueOptions,
        private readonly mpcProvider: MPCProvider,
        private readonly addAccessKeysQueue: AddAccessKeysQueue,
        private readonly fastAuthProvider: FastAuthProvider,
        private readonly privateKeyPem: string,
        private readonly jwtIssuer: string,
        private readonly jwtAudience: string,
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
        const jwt = await new SignJWT({ iss: this.jwtIssuer, sub: job.data.user.localId, aud: this.jwtAudience })
            .setProtectedHeader({ alg: "RS256", kid: "migration-key" })
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(pk);

        await this.mpcProvider.claimOidcToken(jwt);
        const userCredentials = await this.mpcProvider.userCredentials(jwt);
        const oldPublicKey = PublicKey.fromString(userCredentials.recovery_pk);

        const firebaseUser = job.data.user;

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
