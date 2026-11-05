import { Link, NavLink } from "react-router";
import { Button } from "@frontend/design-system-react/button";
import { MailIcon } from "@frontend/design-system-react/icons";
import { NearAuthLogo } from "@frontend/design-system-react/near-auth-logo";
import { cn } from "@frontend/design-system-react/utils";
import { useConfig } from "@frontend/config/react";
import { useGetMe, useGetSession, useSignOut } from "@frontend/console-auth/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { ThemeSelect } from "../theme-select/theme-select";

const NAV_LINK = "flex items-center border-b-2 border-b-transparent text-ink-subtle no-underline hover:text-ink";

const THEME_SELECT =
    "inline-flex items-center gap-2 font-mono text-xs font-medium tracking-kicker text-ink-subtle uppercase [&_select]:min-h-8 [&_select]:rounded-[4px] [&_select]:border [&_select]:border-border-strong [&_select]:bg-surface [&_select]:px-2 [&_select]:py-0 [&_select]:text-ink [&_select]:[font:inherit] [&_select]:tracking-[inherit] [&_select]:[text-transform:inherit]";

/**
 * The class name of a header link, underlined in the accent while its route is active.
 * @param state The link's route state.
 * @param state.isActive Whether the link's route is active.
 * @returns The class name.
 */
function navLinkClassName({ isActive }: { isActive: boolean }): string {
    return cn(NAV_LINK, isActive && "border-b-accent text-ink");
}

export function AppHeader(): React.JSX.Element {
    const translate = useTranslate();
    const docsUrl = useConfig("docsUrl");
    const { data: session } = useGetSession();
    const signedIn = session?.isAuthenticated === true;
    const { data: me } = useGetMe({ enabled: signedIn });
    const { mutate: signOut } = useSignOut();
    const verified = signedIn && me?.emailVerified === true;
    const admin = verified && me?.role === "admin";

    return (
        <header className="flex min-h-16 flex-wrap items-center gap-x-[28px] gap-y-4 border-b border-b-border bg-canvas px-8 py-0 max-[640px]:px-4 max-[640px]:py-3">
            <Link
                to={admin ? "/admin/dapps" : "/"}
                className="flex items-center gap-2 text-ink no-underline"
                aria-label={translate("header.home")}
            >
                <NearAuthLogo />
                {admin ? (
                    <span className="ml-1.5 rounded-[4px] bg-chip-strong-bg px-[7px] py-[3px] font-mono text-2xs font-medium tracking-kicker text-chip-strong-ink uppercase">
                        {translate("header.admin")}
                    </span>
                ) : (
                    <span className="ml-1 border-l border-l-border-strong pl-[10px] font-mono text-2xs font-medium tracking-kicker text-ink-subtle uppercase">
                        {translate("header.console")}
                    </span>
                )}
            </Link>
            {verified && (
                <nav
                    className="flex h-16 items-stretch gap-6 font-mono text-xs font-medium tracking-kicker uppercase"
                    aria-label={translate("header.mainNav")}
                >
                    {admin ? (
                        <NavLink to="/admin/dapps" className={navLinkClassName}>
                            {translate("header.dapps")}
                        </NavLink>
                    ) : (
                        <NavLink to="/" end className={navLinkClassName}>
                            {translate("header.myDapp")}
                        </NavLink>
                    )}
                    <a href={docsUrl} className={NAV_LINK}>
                        {translate("header.docs")}
                    </a>
                </nav>
            )}
            <div className="flex-auto" />
            <div className="flex flex-wrap items-center gap-3">
                <ThemeSelect className={THEME_SELECT} />
                {signedIn && (
                    <>
                        {session.email && (
                            <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 font-mono text-xs text-ink-3 wrap-anywhere">
                                <MailIcon />
                                {session.email}
                            </span>
                        )}
                        <Button variant="secondary" size="small" onClick={() => signOut()}>
                            {translate("header.signOut")}
                        </Button>
                    </>
                )}
            </div>
        </header>
    );
}
