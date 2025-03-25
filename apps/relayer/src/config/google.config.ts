export type GoogleConfig = {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
};

/**
 * Builds the Google configuration.
 * @returns The Google configuration.
 */
export default (): GoogleConfig => {
    return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
    };
};
