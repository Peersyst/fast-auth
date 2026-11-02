import { Link, NavLink } from "react-router-dom";
import type { Me } from "../api/client";
import { cn } from "../lib/cn";
import { DOCS_URL } from "../lib/links";
import { Button } from "../ui/Button";
import { MailIcon } from "../ui/icons";
import { NearAuthLogo } from "../ui/NearAuthLogo";
import { ThemeSelect } from "./ThemeSelect";

type AppHeaderProps = {
    account: { email: string | undefined; session: Me | undefined } | undefined;
    onSignOut: () => void;
};

const NAV_LINK = "flex items-center border-b-2 border-b-transparent text-ink-subtle no-underline hover:text-ink";

const navLinkClass = ({ isActive }: { isActive: boolean }) => cn(NAV_LINK, isActive && "border-b-accent text-ink");

export function AppHeader({ account, onSignOut }: AppHeaderProps) {
    const session = account?.session;
    const admin = session?.role === "admin";
    return (
        <header className="flex min-h-16 flex-wrap items-center gap-x-[28px] gap-y-4 border-b border-b-border bg-canvas px-8 py-0 max-[640px]:px-4 max-[640px]:py-3">
            <Link
                to={admin ? "/admin/dapps" : "/"}
                className="flex items-center gap-2 text-ink no-underline"
                aria-label="NEAR Auth console home"
            >
                <NearAuthLogo />
                {admin ? (
                    <span className="ml-1.5 rounded-[4px] bg-chip-strong-bg px-[7px] py-[3px] font-mono text-[11px] font-medium tracking-kicker text-chip-strong-ink uppercase">
                        Admin
                    </span>
                ) : (
                    <span className="ml-1 border-l border-l-border-strong pl-[10px] font-mono text-[11px] font-medium tracking-kicker text-ink-subtle uppercase">
                        Console
                    </span>
                )}
            </Link>
            {session && (
                <nav className="flex h-16 items-stretch gap-6 font-mono text-xs font-medium tracking-kicker uppercase" aria-label="Main">
                    {admin ? (
                        <NavLink to="/admin/dapps" className={navLinkClass}>
                            dApps
                        </NavLink>
                    ) : (
                        <NavLink to="/" end className={navLinkClass}>
                            My dApp
                        </NavLink>
                    )}
                    <a href={DOCS_URL} className={NAV_LINK}>
                        Docs
                    </a>
                </nav>
            )}
            <div className="flex-auto" />
            <div className="flex flex-wrap items-center gap-3">
                <ThemeSelect className="inline-flex items-center gap-2 font-mono text-xs font-medium tracking-kicker text-ink-subtle uppercase [&_select]:min-h-8 [&_select]:rounded-[4px] [&_select]:border [&_select]:border-border-strong [&_select]:bg-surface [&_select]:px-2 [&_select]:py-0 [&_select]:text-ink [&_select]:[font:inherit] [&_select]:tracking-[inherit] [&_select]:[text-transform:inherit]" />
                {account && (
                    <>
                        {account.email && (
                            <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 font-mono text-xs text-ink-3 wrap-anywhere">
                                <MailIcon />
                                {account.email}
                            </span>
                        )}
                        <Button variant="secondary" size="small" onClick={onSignOut}>
                            Sign out
                        </Button>
                    </>
                )}
            </div>
        </header>
    );
}
