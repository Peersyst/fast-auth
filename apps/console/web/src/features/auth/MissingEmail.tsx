import { SUPPORT_URL } from "../../lib/links";
import { authClasses } from "./classes";

export function MissingEmail() {
    return (
        <section className={authClasses.card}>
            <h1>Your account has no email address</h1>
            <p>
                The console registers each dApp to its owner&apos;s email, and the way you signed in did not share one. Sign out and sign in
                with a method that does, such as Google or email and password.
            </p>
            <p className={authClasses.support}>
                Need help? <a href={SUPPORT_URL}>Contact the NEAR Auth team</a>.
            </p>
        </section>
    );
}
