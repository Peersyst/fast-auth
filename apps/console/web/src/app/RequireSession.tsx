import { PopupOpenError, useAuth0 } from "@auth0/auth0-react";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import { useMe } from "../api/hooks";
import { MissingEmail } from "../features/auth/MissingEmail";
import { SessionContext } from "../features/auth/session";
import { SignIn } from "../features/auth/SignIn";
import { SigningIn } from "../features/auth/SigningIn";
import { useSignOut } from "../features/auth/useSignOut";
import { VerifyEmail } from "../features/auth/VerifyEmail";
import { Button } from "../ui/Button";
import { Callout } from "../ui/Callout";
import styles from "./app.module.css";
import { LoadError } from "./LoadError";
import { LoadingScreen } from "./LoadingScreen";
import { NotFound } from "./NotFound";

type RequireSessionProps = {
    role?: "admin";
};

export function RequireSession({ role }: RequireSessionProps) {
    const { isLoading, isAuthenticated, error, loginWithPopup, loginWithRedirect } = useAuth0();
    const signOut = useSignOut();
    const me = useMe(isAuthenticated);
    const location = useLocation();
    const [signingIn, setSigningIn] = useState(false);
    const popupBlocked = !isLoading && error instanceof PopupOpenError;

    const signIn = () => {
        setSigningIn(true);
        // spa-js gives up on the popup after 60 s by default, too soon for a first sign-up.
        void loginWithPopup(undefined, { timeoutInSeconds: 600 });
    };

    if (isAuthenticated) {
        if (me.error instanceof ApiError && me.error.code === "UNAUTHENTICATED") {
            return (
                <div className={styles.boot}>
                    <Callout tone="error" title="Your session has expired">
                        <p>Sign in again to continue.</p>
                    </Callout>
                    <Button onClick={signOut}>Sign in again</Button>
                </div>
            );
        }
        if (me.data === undefined) {
            if (!me.isError) return <LoadingScreen />;
            if (me.error instanceof ApiError && me.error.code === "EMAIL_REQUIRED") return <MissingEmail />;
            return (
                <LoadError
                    title="Your session could not be checked"
                    error={me.error}
                    onRetry={() => void me.refetch()}
                    retrying={me.isFetching}
                />
            );
        }
        if (!me.data.emailVerified) return <VerifyEmail />;
        if (role === "admin" && me.data.role !== "admin") return <NotFound />;
        return (
            <SessionContext.Provider value={me.data}>
                <Outlet />
            </SessionContext.Provider>
        );
    }
    if (signingIn && (isLoading || popupBlocked)) {
        return (
            <SigningIn
                popupBlocked={popupBlocked}
                onRetryPopup={signIn}
                onContinueInTab={() => void loginWithRedirect({ appState: { returnTo: location.pathname + location.search } })}
            />
        );
    }
    if (isLoading) return <LoadingScreen />;
    return <SignIn onSignIn={signIn} error={error instanceof PopupOpenError ? undefined : error} />;
}
