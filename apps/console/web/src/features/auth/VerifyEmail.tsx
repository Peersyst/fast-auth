import { useAuth0 } from "@auth0/auth0-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Me } from "../../api/client";
import { ME_QUERY_KEY } from "../../api/hooks";
import { SUPPORT_URL } from "../../lib/links";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import styles from "./auth.module.css";

export function VerifyEmail() {
    const { user, getAccessTokenSilently } = useAuth0();
    const queryClient = useQueryClient();
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState<"failed" | "unverified" | null>(null);

    const recheck = async () => {
        setChecking(true);
        setResult(null);
        try {
            await getAccessTokenSilently({ cacheMode: "off" });
            await queryClient.refetchQueries({ queryKey: ME_QUERY_KEY }, { throwOnError: true });
            if (queryClient.getQueryData<Me>(ME_QUERY_KEY)?.emailVerified === false) setResult("unverified");
        } catch {
            setResult("failed");
        } finally {
            setChecking(false);
        }
    };

    return (
        <section className={styles.card}>
            <h1>Verify your email</h1>
            <p>
                Open the verification email NEAR Auth sent to <strong>{user?.email}</strong> and follow its link, then come back here.
            </p>
            {result === "failed" && (
                <Callout tone="error" title="We could not refresh your session">
                    <p>Try again, or sign out and sign in again.</p>
                </Callout>
            )}
            {result === "unverified" && (
                <Callout tone="error" title="Your email is not verified yet">
                    <p>Follow the link in the verification email, then check again. It can take a minute to arrive.</p>
                </Callout>
            )}
            <div className={styles.actions}>
                <Button loading={checking} onClick={() => void recheck()}>
                    I&apos;ve verified my email
                </Button>
            </div>
            <p className={styles.support}>
                No email? <a href={SUPPORT_URL}>Contact the NEAR Auth team</a>.
            </p>
        </section>
    );
}
