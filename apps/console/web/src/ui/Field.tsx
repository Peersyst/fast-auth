import { useId, type ReactNode } from "react";
import styles from "./Field.module.css";

type FieldControlProps = {
    id: string;
    className: string | undefined;
    "aria-describedby": string | undefined;
    "aria-invalid": true | undefined;
    "aria-required": true | undefined;
};

type FieldProps = {
    label: ReactNode;
    tag?: "required" | "optional";
    hint?: ReactNode;
    error?: ReactNode;
    children: (control: FieldControlProps) => ReactNode;
};

export function Field({ label, tag, hint, error, children }: FieldProps) {
    const id = useId();
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ");

    return (
        <div className={styles.field}>
            <div className={styles.labelRow}>
                <label htmlFor={id} className={styles.label}>
                    {label}
                </label>
                {tag && <span className={styles[tag]}>{tag}</span>}
            </div>
            {hint && (
                <p id={hintId} className={styles.hint}>
                    {hint}
                </p>
            )}
            {children({
                id,
                className: styles.control,
                "aria-describedby": describedBy || undefined,
                "aria-invalid": error ? true : undefined,
                "aria-required": tag === "required" || undefined,
            })}
            {error && (
                <p id={errorId} className={styles.error} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
