export type Auth0ProviderOptions = {
    domain: string;
    clientId: string;
    redirectUri: string;
};

export type Auth0RequestSignatureOptions = {
    imageUrl: string;
    name: string;
    redirectUri?: string;
};
