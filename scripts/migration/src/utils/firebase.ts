/**
 *
 * @param internalAccountId
 */
export const firebaseIdFromInternalAccountId = (internalAccountId: string) => {
    const regExpMatchArray = internalAccountId.match(/https{0,1}:\/\/.*:([a-zA-Z0-9]+)$/);
    if (!regExpMatchArray || !regExpMatchArray[1]) {
        throw new Error("could not obtain firebaseId from " + internalAccountId);
    }
    return regExpMatchArray[1];
};

/**
 *
 * @param provider
 */
export const firebaseProviderToAuth0Provider = (provider: string): string => {
    switch (provider) {
        case "google.com":
            return "google-oauth2";
        default:
            throw new Error("firebaseProvider unknown " + provider);
    }
};
