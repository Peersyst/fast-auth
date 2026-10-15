import type { ReactNode } from "react";
import type { FieldValue } from "../../lib/dapp-fields";
import styles from "./values.module.css";

export type FieldRow = [label: string, value: ReactNode];

type FieldListClasses = { list: string | undefined; row?: string | undefined };

export function FieldList({
    rows,
    classes = { list: styles.fields, row: styles.fieldRow },
}: {
    rows: FieldRow[];
    classes?: FieldListClasses;
}) {
    return (
        <dl className={classes.list}>
            {rows.map(([label, value]) => (
                <div key={label} className={classes.row}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                </div>
            ))}
        </dl>
    );
}

export function Value({ value, code = false }: { value: FieldValue; code?: boolean }) {
    if (value.length === 0) return <span className={styles.none}>None</span>;
    const text = (item: string) => (code ? <code className={styles.code}>{item}</code> : item);
    if (!Array.isArray(value)) return text(value);
    return (
        <ul className={styles.values}>
            {value.map((item) => (
                <li key={item}>{text(item)}</li>
            ))}
        </ul>
    );
}
