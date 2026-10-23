import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import styles from "./auth.module.css";

type SignInProps = {
    onSignIn: () => void;
    error: Error | undefined;
};

export function SignIn({ onSignIn, error }: SignInProps) {
    return (
        <section className={styles.card}>
            <p className={styles.kicker}>NEAR Auth Console</p>
            <h1>Sign in to manage your dApp</h1>
            <p className={styles.lede}>Use your NEAR Auth account. Your dApp is registered to the email address you sign in with.</p>
            {error && (
                <Callout tone="error" title="Sign-in did not finish">
                    <p>Please try again.</p>
                </Callout>
            )}
            <div className={styles.actions}>
                <Button onClick={onSignIn}>Sign in with NEAR Auth</Button>
            </div>
        </section>
    );
}
