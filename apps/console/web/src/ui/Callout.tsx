import type { ReactNode } from "react";
import styles from "./Callout.module.css";
import { ErrorIcon, InfoIcon, TipIcon, WarningIcon } from "./icons";

type CalloutProps = {
    tone: "info" | "tip" | "warning" | "error";
    id?: string;
    title?: string;
    children: ReactNode;
    className?: string;
};

const ICONS = { info: InfoIcon, tip: TipIcon, warning: WarningIcon, error: ErrorIcon };

export function Callout({ tone, id, title, children, className }: CalloutProps) {
    const Icon = ICONS[tone];
    return (
        <div
            id={id}
            className={[styles.callout, styles[tone], className].filter(Boolean).join(" ")}
            role={tone === "error" ? "alert" : undefined}
        >
            <span className={styles.icon}>
                <Icon />
            </span>
            <div className={styles.body}>
                {title && <p className={styles.title}>{title}</p>}
                {children}
            </div>
        </div>
    );
}
