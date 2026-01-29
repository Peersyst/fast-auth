import React, { createContext, useEffect, useMemo, useState } from "react";
import { FastAuthClient, IFastAuthProvider } from "../core";
import { FastAuthProviderProps, IFastAuthContext } from "./fast-auth.provider.types";

/**
 * Context for FastAuth
 */
export const FastAuthContext = createContext<IFastAuthContext | null>(null);

/**
 * FastAuthProvider component.
 *
 * Provides FastAuth client to the React component tree.
 * Manages the FastAuth client lifecycle.
 * @param props The component props.
 * @param props.children The children to render.
 * @param props.providerConfig The provider configuration.
 * @param props.connection The connection to use.
 * @param props.network The network to use.
 * @returns The provider component.
 * @example
 * ```tsx
 * import { FastAuthProvider } from '@fast-auth/react';
 * import { JavascriptProvider } from '@fast-auth-near/javascript-provider';
 *
 * function App() {
 *   const providerConfig = {
 *     provider: new JavascriptProvider({
 *       domain: 'your-domain.auth0.com',
 *       clientId: 'your-client-id',
 *       redirectUri: window.location.origin,
 *       audience: 'your-audience'
 *     })
 *   };
 *
 *   return (
 *     <FastAuthProvider
 *       providerConfig={providerConfig}
 *       connection={connection}
 *       clientOptions={clientOptions}
 *     >
 *       <YourApp />
 *     </FastAuthProvider>
 *   );
 * }
 * ```
 */
export function FastAuthProvider<P extends IFastAuthProvider = IFastAuthProvider>({
    children,
    providerConfig,
    connection,
    network,
}: FastAuthProviderProps<P>) {
    const { reactProvider = (children) => children, provider } = providerConfig;

    // State management
    const [client, setClient] = useState<FastAuthClient<P> | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Initialize client on mount or when dependencies change
    useEffect(() => {
        try {
            const newClient = new FastAuthClient<P>(provider, connection, network, "https://localhost:3001/api/relayer/fast-auth");
            setClient(newClient);
            setIsReady(true);
        } catch {
            setIsReady(false);
        }
    }, [provider, connection, network]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo<IFastAuthContext<P>>(
        () => ({
            client,
            isReady,
        }),
        [client, isReady],
    );

    return <FastAuthContext.Provider value={contextValue}>{reactProvider(children)}</FastAuthContext.Provider>;
}
