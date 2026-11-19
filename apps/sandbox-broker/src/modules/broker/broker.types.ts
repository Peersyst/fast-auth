/** Query params as Express parses them: a repeated param arrives as an array. */
export type Query = Record<string, unknown>;

/** How the broker answers the dApp: a redirect for `loginWithRedirect`, a `postMessage` for `loginWithPopup`. */
export type ResponseMode = "query" | "web_message";

/** Where, and how, the broker answers the dApp that started a sign-in. */
export interface DappReturn {
    redirectUri: string;
    origin: string;
    /** The dApp's own state, echoed back so it can match the answer to its request. */
    state: string;
    responseMode: ResponseMode;
}

/** The tokens Auth0 issued, as its token endpoint returns them, without a refresh token. */
export interface TokenSet {
    access_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
    scope?: string;
}

/** What the broker sends back to the dApp: a code, or an OAuth error. */
export interface Delivery {
    dapp: DappReturn;
    params: Record<string, string>;
}
