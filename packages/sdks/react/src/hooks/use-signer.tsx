import { useCallback, useEffect, useState } from "react";
import { useFastAuth } from "./use-fast-auth";
import { FastAuthSigner, IFastAuthProvider } from "../core";

/**
 * Hook to get the FastAuth signer.
 *
 * This hook provides a convenient way to get the signer from the client
 * and manages loading and error states.
 * @param autoFetch Whether to automatically fetch the signer when client is ready (default: true).
 * @returns Object containing signer, loading state, error, and refetch function.
 * @example
 * ```tsx
 * import { useSigner } from '@fast-auth/react';
 *
 * function MyComponent() {
 *   const { signer, isLoading, error } = useSigner();
 *
 *   if (isLoading) {
 *     return <div>Loading signer...</div>;
 *   }
 *
 *   if (error) {
 *     return <div>Error: {error.message}</div>;
 *   }
 *
 *   if (!signer) {
 *     return <div>Please log in</div>;
 *   }
 *
 *   return <div>Signer ready!</div>;
 * }
 * ```
 */
export function useSigner<P extends IFastAuthProvider = IFastAuthProvider>(autoFetch: boolean = true) {
    const { client, isReady } = useFastAuth<P>();
    const [signer, setSigner] = useState<FastAuthSigner<P> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchSigner = useCallback(async () => {
        if (!client || !isReady) {
            setSigner(null);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const newSigner = await client.getSigner();
            setSigner(newSigner);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            setSigner(null);
        } finally {
            setIsLoading(false);
        }
    }, [client, isReady]);

    useEffect(() => {
        if (autoFetch && client && isReady) {
            fetchSigner();
        } else if (!client || !isReady) {
            setSigner(null);
        }
    }, [autoFetch, client, isReady, fetchSigner]);

    return {
        signer,
        isLoading,
        error,
        refetch: fetchSigner,
    };
}
