import { useId } from "react";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { Spinner } from "../../ui/Spinner";
import styles from "./auth.module.css";

type SigningInProps = {
    popupBlocked: boolean;
    onRetryPopup: () => void;
    onContinueInTab: () => void;
};

export function SigningIn({ popupBlocked, onRetryPopup, onContinueInTab }: SigningInProps) {
    const blockedId = useId();
    return (
        <section className={styles.card}>
            <h1>Signing you in</h1>
            {popupBlocked ? (
                <>
                    <Callout tone="warning" id={blockedId} title="Your browser blocked the sign-in window">
                        <p>Continue in this tab instead; you will come back here once you have signed in.</p>
                    </Callout>
                    <div className={styles.actions}>
                        <Button autoFocus aria-describedby={blockedId} onClick={onContinueInTab}>
                            Continue in this tab
                        </Button>
                        <Button variant="secondary" onClick={onRetryPopup}>
                            Try the window again
                        </Button>
                    </div>
                </>
            ) : (
                <p className={styles.status} role="status">
                    <Spinner />
                    Complete sign-in in the NEAR Auth window.
                </p>
            )}
        </section>
    );
}
