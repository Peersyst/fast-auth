import { Link, NavLink } from "react-router-dom";
import type { Me } from "../api/client";
import { DOCS_URL } from "../lib/links";
import { Button } from "../ui/Button";
import { MailIcon } from "../ui/icons";
import { NearAuthLogo } from "../ui/NearAuthLogo";
import styles from "./AppHeader.module.css";
import { ThemeSelect } from "./ThemeSelect";

type AppHeaderProps = {
    account: { email: string | undefined; session: Me | undefined } | undefined;
    onSignOut: () => void;
};

const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink);

export function AppHeader({ account, onSignOut }: AppHeaderProps) {
    const session = account?.session;
    const admin = session?.role === "admin";
    return (
        <header className={styles.header}>
            <Link to={admin ? "/admin/dapps" : "/"} className={styles.brand} aria-label="NEAR Auth console home">
                <NearAuthLogo />
                {admin ? <span className={styles.adminChip}>Admin</span> : <span className={styles.product}>Console</span>}
            </Link>
            {session && (
                <nav className={styles.nav} aria-label="Main">
                    {admin ? (
                        <NavLink to="/admin/dapps" className={navLinkClass}>
                            dApps
                        </NavLink>
                    ) : (
                        <NavLink to="/" end className={navLinkClass}>
                            My dApp
                        </NavLink>
                    )}
                    <a href={DOCS_URL} className={styles.navLink}>
                        Docs
                    </a>
                </nav>
            )}
            <div className={styles.spacer} />
            <div className={styles.account}>
                <ThemeSelect className={styles.theme} />
                {account && (
                    <>
                        {account.email && (
                            <span className={styles.email}>
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
