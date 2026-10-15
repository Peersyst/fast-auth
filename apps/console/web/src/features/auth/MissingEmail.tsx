import { SUPPORT_URL } from "../../lib/links";
import styles from "./auth.module.css";

export function MissingEmail() {
    return (
        <section className={styles.card}>
            <h1>Your account has no email address</h1>
            <p>
                The console registers each dApp to its owner&apos;s email, and the way you signed in did not share one. Sign out and sign in
                with a method that does, such as Google or email and password.
            </p>
            <p className={styles.support}>
                Need help? <a href={SUPPORT_URL}>Contact the NEAR Auth team</a>.
            </p>
        </section>
    );
}
