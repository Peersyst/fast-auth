import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeTone = "warning" | "success" | "danger" | "neutral" | "info";

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
    return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
