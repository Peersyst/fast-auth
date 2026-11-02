import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { authClasses } from "./classes";

type SignInProps = {
    onSignIn: () => void;
    error: Error | undefined;
};

export function SignIn({ onSignIn, error }: SignInProps) {
    return (
        <section className={authClasses.card}>
            <p className="font-mono text-xs tracking-kicker text-ink-subtle uppercase">NEAR Auth Console</p>
            <h1>Sign in to manage your dApp</h1>
            <p className="text-ink-subtle">Use your NEAR Auth account. Your dApp is registered to the email address you sign in with.</p>
            {error && (
                <Callout tone="error" title="Sign-in did not finish">
                    <p>Please try again.</p>
                </Callout>
            )}
            <div className={authClasses.actions}>
                <Button onClick={onSignIn}>Sign in with NEAR Auth</Button>
            </div>
        </section>
    );
}
