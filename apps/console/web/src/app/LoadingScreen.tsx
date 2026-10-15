import { Spinner } from "../ui/Spinner";
import styles from "./app.module.css";

export function LoadingScreen() {
    return (
        <div className={styles.loading} role="status">
            <Spinner />
            Loading…
        </div>
    );
}
