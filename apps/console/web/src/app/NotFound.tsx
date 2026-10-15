import { Link } from "react-router-dom";
import styles from "./app.module.css";

export function NotFound() {
    return (
        <section className={styles.page}>
            <h1>Page not found</h1>
            <p>
                <Link to="/">Go to the console</Link>
            </p>
        </section>
    );
}
