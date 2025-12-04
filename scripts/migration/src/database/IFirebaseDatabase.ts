export type FirebaseUser = {
    localId: string;
    email?: string;
    providerUserInfo: {
        providerId: string;
        rawId: string;
    }[];
};

export interface IFirebaseDatabase {
    findById(id: string): Promise<FirebaseUser>;
    iterateAll(callback: (user: FirebaseUser) => Promise<void>): Promise<void>;
}
