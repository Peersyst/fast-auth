import { useContext } from "react";
import { FastAuthContext } from "../providers/fast-auth.provider";
import { IFastAuthContext } from "../providers/fast-auth.provider.types";
import { IFastAuthProvider } from "../core";

/**
 * Hook to access the FastAuth context
 * 
 * This hook provides access to the FastAuth client and ready state.
 * All operations should be performed through the client directly.
 * 
 * @throws Error if used outside of FastAuthProvider
 * 
 * @example
 * ```tsx
 * import { useFastAuth } from '@fast-auth/react';
 * 
 * function MyComponent() {
 *   const { client, isReady } = useFastAuth();
 * 
 *   if (!isReady || !client) {
 *     return <div>Loading...</div>;
 *   }
 * 
 *   // Use client directly for all operations
 *   const handleLogin = async () => {
 *     await client.login();
 *   };
 * 
 *   return (
 *     <button onClick={handleLogin}>Login</button>
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