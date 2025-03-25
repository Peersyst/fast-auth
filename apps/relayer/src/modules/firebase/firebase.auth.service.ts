import { Injectable } from "@nestjs/common";
import admin from "firebase-admin";

@Injectable()
export class FirebaseAuthService {
    constructor() {}

    /**
     * Verify an ID token.
     * @param token The ID token to verify.
     * @returns The decoded token.
     */
    async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
        return await admin.auth().verifyIdToken(token);
    }

    /**
     * Create a custom token.
     * @param uid The UID of the user.
     * @param additionalClaims Additional claims to include in the token.
     * @returns The custom token.
     */
    async createCustomToken(uid: string, additionalClaims?: Record<string, any>): Promise<string> {
        return await admin.auth().createCustomToken(uid, additionalClaims);
    }

    /**
     * Create a user.
     * @param id The UID of the user.
     * @param email The email of the user.
     * @param name The name of the user.
     * @returns The user.
     */
    async createUser(id: string, email: string, name: string): Promise<admin.auth.UserRecord> {
        return await admin.auth().createUser({
            uid: id,
            email,
            displayName: name,
        });
    }

    /**
     * Get a user by email.
     * @param email The email of the user.
     * @returns The user.
     */
    async getUserByEmail(email: string): Promise<admin.auth.UserRecord | undefined> {
        try {
            return await admin.auth().getUserByEmail(email);
        } catch (error) {
            if (error.code === "auth/user-not-found") {
                return undefined;
            }
            throw error;
        }
    }
}
