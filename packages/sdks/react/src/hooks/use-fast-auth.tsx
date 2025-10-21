import { useContext } from "react";
import { FastAuthContext } from "../providers/fast-auth.provider";
import { IFastAuthContext } from "../providers/fast-auth.provider.types";
import { IFastAuthProvider } from "../core";

/**
 * Hook to access the FastAuth context
 * 
 * This hook provides access to all FastAuth functionality including:
 * - Authentication (login, logout, isLoggedIn)
 * - Client state (isReady, isLoading, error)
 * - Signer operations (getSigner, getPublicKey, createAccount)
 * - Transaction operations (requestTransactionSignature, sendTransaction)
 * - Signature operations (getSignatureRequest, createSignAction)
 * 
 * @throws Error if used outside of FastAuthProvider
 * 
 * @example
 * ```tsx
 * import { useFastAuth } from '@fast-auth/react';
 * 
 * function MyComponent() {
 *   const { login, logout, isLoggedIn, isLoading } = useFastAuth();
 * 
 *   if (isLoading) {
 *     return <div>Loading...</div>;
 *   }
 * 
 *   return (
 *     <div>
 *       {isLoggedIn ? (
 *         <button onClick={logout}>Logout</button>
 *       ) : (
 *         <button onClick={() => login()}>Login</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFastAuth<P extends IFastAuthProvider = IFastAuthProvider>(): IFastAuthContext<P> {
    const context = useContext(FastAuthContext);
    if (context === null) {
        throw new Error("useFastAuth must be used within a FastAuthProvider");
    }
    return context as IFastAuthContext<P>;
}