import * as admin from "firebase-admin";
import { FirebaseUser, IFirebaseDatabase } from "./IFirebaseDatabase";

export class RemoteFirebaseDatabase implements IFirebaseDatabase {
    constructor() {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}")),
        });
    }

    /**
     *
     * @param id
     */
    async findById(id: string): Promise<FirebaseUser> {
        const remoteUser = await admin.auth().getUser(id);
        return {
            localId: remoteUser.uid,
            email: remoteUser.email,
            providerUserInfo: remoteUser.providerData.map((provider) => ({
                providerId: provider.providerId,
                rawId: provider.uid,
            })),
        };
    }

    /**
     *
     * @param _
     */
    async iterateAll(_: (user: FirebaseUser) => Promise<void>): Promise<void> {
        throw new Error("Method not implemented");
    }
}
