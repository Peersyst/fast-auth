export type FirebaseConfig = {
    serviceAccountPath: string;
};

/**
 * Builds the Firebase configuration.
 * @returns The Firebase configuration.
 */
export default (): FirebaseConfig => {
    return {
        serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    };
};
