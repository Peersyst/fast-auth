import * as fs from "node:fs";

export type FirebaseUser = {
    localId: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    photoUrl: string;
    lastSignedInAt: string;
    createdAt: string;
    providerUserInfo: {
        providerId: string;
        rawId: string;
        email: string;
        displayName: string;
        photoUrl: string;
    }[];
};

export type FirebaseExport = {
    users: FirebaseUser[];
};

export class FirebaseDatabase {
    export: FirebaseExport;

    constructor(private readonly exportFile: string) {
        const file = fs.readFileSync(this.exportFile);
        this.export = JSON.parse(file.toString());
    }

    /**
     *
     * @param id
     */
    findById(id: string): FirebaseUser {
        const user = this.export.users.find((user) => user.localId === id);
        if (!user) throw new Error("firebase user not found");
        return user;
    }
}
