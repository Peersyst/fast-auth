import { ERASED } from "../../../../src/domain/dapp";
import styles from "./admin.module.css";

export function isErased(email: string): boolean {
    return email === ERASED;
}

export function OwnerEmail({ email }: { email: string }) {
    return isErased(email) ? <span className={styles.muted}>Erased</span> : <>{email}</>;
}
