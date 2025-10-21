import { useCallback, useEffect, useState } from "react";
import { useSigner } from "./use-signer";
import { IFastAuthProvider } from "../core";
import { Algorithm } from "../core/common/signature/types";

/**
 * Hook to get the user's public key
 * 
 * This hook automatically fetches the public key when the user is logged in
 * and provides loading and error states.
 * 
 * @param algorithm - The algorithm to use for the public key (default: "ed25519")
 * @param autoFetch - Whether to automatically fetch the public key when logged in (default: true)
 * @returns Object containing public key, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * import { usePublicKey } from '@fast-auth/react';
 * 
 * function MyComponent() {
 *   const { publicKey, isLoading, error } = usePublicKey();
 * 
 *   if (isLoading) {
 *     return <div>Loading public key...</div>;
 *   }
 * 
 *   if (error) {
 *     return <div>Error: {error.message}</div>;
 *   }
 * 
 *   if (!publicKey) {
 *     return <div>Please log in</div>;
 *   }
 * 
 *   return <div>Public Key: {publicKey.toString()}</div>;
 * }
 * ```
 */
export function usePublicKey<P extends IFastAuthProvider = IFastAuthProvider>(
    algorithm: Algorithm = "ed25519",
    autoFetch: boolean = true
) {
    const { signer } = useSigner<P>(autoFetch);
    const [publicKey, setPublicKey] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchPublicKey = useCallback(async () => {
        if (!signer) {
            setPublicKey(null);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const key = await signer.getPublicKey(algorithm);
            setPublicKey(key);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            setPublicKey(null);
        } finally {
            setIsLoading(false);
        }
    }, [signer, algorithm]);

    useEffect(() => {
        if (autoFetch && signer) {
            fetchPublicKey();
        } else if (!signer) {
            setPublicKey(null);
        }
    }, [autoFetch, signer, fetchPublicKey]);

    return {
        publicKey,
        isLoading,
        error,
        refetch: fetchPublicKey,
    };
}

