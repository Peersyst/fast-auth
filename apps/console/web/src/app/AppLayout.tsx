import { useAuth0 } from "@auth0/auth0-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { CONFIG_QUERY_KEY, useMe } from "../api/hooks";
import { useSignOut } from "../features/auth/useSignOut";
import styles from "./app.module.css";
import { AppHeader } from "./AppHeader";

export function AppLayout() {
    const { isAuthenticated, user } = useAuth0();
    const me = useMe(isAuthenticated);
    const queryClient = useQueryClient();
    useEffect(() => {
        if (!isAuthenticated) queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== CONFIG_QUERY_KEY[0] });
    }, [isAuthenticated, queryClient]);
    const signOut = useSignOut();
    const session = isAuthenticated && me.data?.emailVerified ? me.data : undefined;

    return (
        <div className={styles.layout}>
            <AppHeader account={isAuthenticated ? { email: user?.email, session } : undefined} onSignOut={signOut} />
            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    );
}
