import { useCallback, useEffect, useState } from "react";
import { useFastAuth } from "./use-fast-auth";
import { IFastAuthProvider } from "../core";

/**
 * Hook to get the current login status
 * 
 * This hook checks the login status through the client's provider
 * and provides loading and error states.
 * 
 * @param autoCheck - Whether to automatically check login status when client is ready (default: true)
 * @returns Object containing login status, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * import { useIsLoggedIn } from '@fast-auth/react';
 * 
 * function MyComponent() {
 *   const { isLoggedIn, isLoading, error } = useIsLoggedIn();
 * 
 *   if (isLoading) {
 *     return <div>Checking login status...</div>;
 *   }
 * 
 *   if (error) {
 *     return <div>Error: {error.message}</div>;
 *   }
 * 
 *   return <div>{isLoggedIn ? 'Logged in' : 'Not logged in'}</div>;
 * }
 * ```
 */
export function useIsLoggedIn<P extends IFastAuthProvider = IFastAuthProvider>(autoCheck: boolean = true) {
    const { client, isReady } = useFastAuth<P>();
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const checkLoginStatus = useCallback(async () => {
        if (!client || !isReady) {
            setIsLoggedIn(null);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const loggedIn = await client.isLoggedIn();
            setIsLoggedIn(loggedIn);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            setIsLoggedIn(false);
        } finally {
            setIsLoading(false);
        }
    }, [client, isReady]);

    useEffect(() => {
        if (autoCheck && client && isReady) {
            checkLoginStatus();
        } else if (!client || !isReady) {
            setIsLoggedIn(null);
        }
    }, [autoCheck, client, isReady, checkLoginStatus]);

    return {
        isLoggedIn,
        isLoading,
        error,
        refetch: checkLoginStatus,
    };
}

