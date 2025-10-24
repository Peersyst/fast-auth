import React, { createContext, useEffect, useMemo, useState } from "react";
import { FastAuthClient, IFastAuthProvider } from "../core";
import { FastAuthProviderProps, IFastAuthContext } from "./fast-auth.provider.types";

/**
 * Context for FastAuth
 */
export const FastAuthContext = createContext<IFastAuthContext | null>(null);

/**
 * FastAuthProvider component
 * 
 * Provides FastAuth client to the React component tree.
 * Manages the FastAuth client lifecycle.
 * 
 * @example
 * ```tsx
 * import { FastAuthProvider } from '@fast-auth/react';
 * import { JavascriptProvider } from '@fast-auth/javascript-provider';
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
            const newClient = new FastAuthClient<P>(provider, connection, network);
            setClient(newClient);
            setIsReady(true);
        } catch (err) {
            console.error("Failed to initialize FastAuth client:", err);
            setIsReady(false);
        }
    }, [provider, connection, network]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo<IFastAuthContext<P>>(() => ({
        client,
        isReady,
    }), [client, isReady]);

    return (
        <FastAuthContext.Provider value={contextValue}>
            {reactProvider(children)}
        </FastAuthContext.Provider>
    );
}