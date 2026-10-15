import type { ReactNode } from "react";
import styles from "./Callout.module.css";

type CalloutProps = {
    tone: "warning" | "error";
    id?: string;
    title: string;
    children: ReactNode;
};

export function Callout({ tone, id, title, children }: CalloutProps) {
    return (
        <div id={id} className={`${styles.callout} ${styles[tone]}`} role={tone === "error" ? "alert" : undefined}>
            <p className={styles.title}>{title}</p>
            {children}
        </div>
    );
}
