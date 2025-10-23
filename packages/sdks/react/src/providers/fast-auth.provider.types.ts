import { PropsWithChildren, ReactNode } from "react";
import { 
    FastAuthClient, 
    FastAuthClientOptions, 
    IFastAuthProvider
} from "../core";
import { Connection } from "near-api-js";

/**
 * Context value exposed by FastAuthProvider
 */
export interface IFastAuthContext<P extends IFastAuthProvider = IFastAuthProvider> {
    /**
     * The FastAuth client instance. Null until initialized.
     */
    client: FastAuthClient<P> | null;

    /**
     * Whether the client is ready to use
     */
    isReady: boolean;
}

/**
 * Configuration for the auth provider
 */
export type FastAuthProviderConfig<P extends IFastAuthProvider = IFastAuthProvider> = {
    /**
     * The auth provider implementation (e.g., JavascriptProvider, ReactNativeProvider)
     */
    provider: P;

    /**
     * Optional React provider wrapper for the auth provider
     * (e.g., Auth0Provider for react-native-auth0)
     */
    reactProvider?: (children: ReactNode) => ReactNode;
};

/**
 * Props for FastAuthProvider component
 */
export type FastAuthProviderProps<P extends IFastAuthProvider = IFastAuthProvider> = PropsWithChildren<{
    /**
     * Provider configuration
     */
    providerConfig: FastAuthProviderConfig<P>;

    /**
     * NEAR connection instance
     */
    connection: Connection;

    /**
     * FastAuth client options
     */
    clientOptions: FastAuthClientOptions;
}>;