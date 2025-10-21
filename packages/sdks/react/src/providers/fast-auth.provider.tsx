import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { FastAuthClient, FastAuthSigner, IFastAuthProvider, SignatureRequest, FastAuthSignature } from "../core";
import { FastAuthProviderProps, IFastAuthContext } from "./fast-auth.provider.types";
import { Algorithm } from "../core/common/signature/types";
import { Action, Transaction } from "near-api-js/lib/transaction";
import { CreateAccountOptions, CreateSignActionOptions } from "../core/signers/signer.types";

/**
 * Context for FastAuth
 */
export const FastAuthContext = createContext<IFastAuthContext | null>(null);

/**
 * FastAuthProvider component
 * 
 * Provides FastAuth functionality to the React component tree.
 * Manages the FastAuth client lifecycle and authentication state.
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
    clientOptions,
    autoCheckLogin = true 
}: FastAuthProviderProps<P>) {
    const { reactProvider = (children) => children, provider } = providerConfig;

    // State management
    const [client, setClient] = useState<FastAuthClient<P> | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Initialize client on mount or when dependencies change
    useEffect(() => {
        try {
            const newClient = new FastAuthClient<P>(provider, connection, clientOptions);
            setClient(newClient);
            setIsReady(true);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setIsReady(false);
        }
    }, [provider, connection, clientOptions]);

    // Check login status on mount if autoCheckLogin is enabled
    useEffect(() => {
        if (autoCheckLogin && client) {
            const checkLoginStatus = async () => {
                try {
                    setIsLoading(true);
                    const loggedIn = await provider.isLoggedIn();
                    setIsLoggedIn(loggedIn);
                    setError(null);
                } catch (err) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setIsLoggedIn(false);
                } finally {
                    setIsLoading(false);
                }
            };

            checkLoginStatus();
        }
    }, [client, provider, autoCheckLogin]);

    // Memoized login function
    const login = useCallback(async (...args: Parameters<P["login"]>) => {
        if (!client) {
            throw new Error("FastAuth client not initialized");
        }

        try {
            setIsLoading(true);
            setError(null);
            await client.login(...args);
            // After redirect, isLoggedIn will be updated by the autoCheckLogin effect
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    // Memoized logout function
    const logout = useCallback(async () => {
        if (!client) {
            throw new Error("FastAuth client not initialized");
        }

        try {
            setIsLoading(true);
            setError(null);
            await client.logout();
            setIsLoggedIn(false);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    // Memoized getSigner function
    const getSigner = useCallback(async (): Promise<FastAuthSigner<P>> => {
        if (!client) {
            throw new Error("FastAuth client not initialized");
        }

        try {
            setIsLoading(true);
            setError(null);
            const signer = await client.getSigner();
            return signer;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    // Signer-delegated functions
    const requestTransactionSignature = useCallback(async (...args: Parameters<P["requestTransactionSignature"]>) => {
        const signer = await getSigner();
        return signer.requestTransactionSignature(...args);
    }, [getSigner]);

    const requestDelegateActionSignature = useCallback(async (...args: Parameters<P["requestDelegateActionSignature"]>) => {
        const signer = await getSigner();
        return signer.requestDelegateActionSignature(...args);
    }, [getSigner]);

    const getSignatureRequest = useCallback(async (): Promise<SignatureRequest> => {
        const signer = await getSigner();
        return signer.getSignatureRequest();
    }, [getSigner]);

    const getPath = useCallback(async (): Promise<string> => {
        if (!provider) {
            throw new Error("FastAuth provider not initialized");
        }
        return provider.getPath();
    }, [provider]);

    const getPublicKey = useCallback(async (algorithm?: Algorithm) => {
        const signer = await getSigner();
        return signer.getPublicKey(algorithm);
    }, [getSigner]);

    const createSignAction = useCallback(async (
        request: SignatureRequest, 
        options?: CreateSignActionOptions
    ): Promise<Action> => {
        const signer = await getSigner();
        return signer.createSignAction(request, options);
    }, [getSigner]);

    const createAccount = useCallback(async (
        accountId: string, 
        options?: CreateAccountOptions
    ): Promise<Action> => {
        const signer = await getSigner();
        return signer.createAccount(accountId, options);
    }, [getSigner]);

    const sendTransaction = useCallback(async (
        transaction: Transaction, 
        signature: FastAuthSignature, 
        algorithm?: Algorithm
    ) => {
        const signer = await getSigner();
        return signer.sendTransaction(transaction, signature, algorithm);
    }, [getSigner]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo<IFastAuthContext<P>>(() => ({
        client,
        isReady,
        isLoggedIn,
        isLoading,
        error,
        login,
        logout,
        getSigner,
        requestTransactionSignature,
        requestDelegateActionSignature,
        getSignatureRequest,
        getPath,
        getPublicKey,
        createSignAction,
        createAccount,
        sendTransaction,
    }), [
        client,
        isReady,
        isLoggedIn,
        isLoading,
        error,
        login,
        logout,
        getSigner,
        requestTransactionSignature,
        requestDelegateActionSignature,
        getSignatureRequest,
        getPath,
        getPublicKey,
        createSignAction,
        createAccount,
        sendTransaction,
    ]);

    return (
        <FastAuthContext.Provider value={contextValue}>
            {reactProvider(children)}
        </FastAuthContext.Provider>
    );
}