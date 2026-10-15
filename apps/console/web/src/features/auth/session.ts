import { createContext, useContext } from "react";
import type { Me } from "../../api/client";

export const SessionContext = createContext<Me | null>(null);

export function useSession(): Me {
    const session = useContext(SessionContext);
    if (!session) throw new Error("useSession must be used under RequireSession");
    return session;
}
