import { useFastAuth } from "./use-fast-auth";
import { IFastAuthProvider } from "../core";

/**
 * Hook to get the current login status
 * 
 * @returns The current login status (true, false, or null if not yet determined)
 * 
 * @example
 * ```tsx
 * import { useIsLoggedIn } from '@fast-auth/react';
 * 
 * function MyComponent() {
 *   const isLoggedIn = useIsLoggedIn();
 * 
 *   if (isLoggedIn === null) {
 *     return <div>Checking login status...</div>;
 *   }
 * 
 *   return <div>{isLoggedIn ? 'Logged in' : 'Not logged in'}</div>;
 * }
 * ```
 */
export function useIsLoggedIn<P extends IFastAuthProvider = IFastAuthProvider>(): boolean | null {
    const { isLoggedIn } = useFastAuth<P>();
    return isLoggedIn;
}

