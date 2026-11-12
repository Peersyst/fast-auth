import { Outlet, useLocation } from "react-router";
import { Role } from "@shared/console";
import { ConsoleAuthErrors } from "@frontend/console-auth/domain/errors";
import { useContinueInTab, useGetMe, useGetSession, useSignIn, useSignOut } from "@frontend/console-auth/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { LoadingScreen } from "../../../common/components/feedback/loading-screen/loading-screen";
import { LoadError } from "../../../common/components/feedback/load-error/load-error";
import { NotFoundScreen } from "../../../common/screens/not-found/not-found.screen";
import { MissingEmail } from "../../components/missing-email/missing-email";
import { SessionExpired } from "../../components/session-expired/session-expired";
import { SignIn } from "../../components/sign-in/sign-in";
import { SigningIn } from "../../components/signing-in/signing-in";
import { VerifyEmail } from "../verify-email/verify-email";

export type SessionGateProps = {
    role?: Role;
};

/**
 * Renders the route, handing it the user (`useSessionUser`), only for a signed-in user with a verified email.
 * A route that needs a role also needs the user to have it. Anyone else gets the step they are at: signing in, an expired
 * session, a missing or unverified email.
 * @param props The role the route needs.
 * @returns The route or the step.
 */
export function SessionGate({ role }: SessionGateProps): React.JSX.Element {
    const translate = useTranslate();
    const location = useLocation();
    const session = useGetSession();
    const signedIn = session.data?.isAuthenticated === true;
    const me = useGetMe({ enabled: signedIn });
    const signIn = useSignIn();
    const { mutate: continueInTab } = useContinueInTab();
    const { mutate: signOut } = useSignOut();

    if (session.isError) {
        return (
            <LoadError
                title={translate("loadError.session")}
                error={session.error}
                onRetry={() => void session.refetch()}
                retrying={session.isFetching}
            />
        );
    }
    if (!session.data) return <LoadingScreen />;

    if (session.data.isAuthenticated) {
        if (me.error?.message === ConsoleAuthErrors.SESSION_EXPIRED) return <SessionExpired onSignIn={() => signOut()} />;
        if (me.data === undefined) {
            if (!me.isError) return <LoadingScreen />;
            if (me.error.message === ConsoleAuthErrors.EMAIL_REQUIRED) return <MissingEmail />;
            return (
                <LoadError
                    title={translate("loadError.session")}
                    error={me.error}
                    onRetry={() => void me.refetch()}
                    retrying={me.isFetching}
                />
            );
        }
        if (!me.data.emailVerified) return <VerifyEmail email={session.data.email} />;
        if (role && me.data.role !== role) return <NotFoundScreen />;
        return <Outlet context={me.data} />;
    }

    const popupBlocked = signIn.error?.message === ConsoleAuthErrors.POPUP_BLOCKED;
    if (signIn.isPending || popupBlocked) {
        return (
            <SigningIn
                popupBlocked={popupBlocked}
                onRetryPopup={() => signIn.mutate()}
                onContinueInTab={() => continueInTab(location.pathname + location.search)}
            />
        );
    }
    return <SignIn onSignIn={() => signIn.mutate()} failed={signIn.isError} />;
}
