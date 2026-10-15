import { FIELD_LABELS, type FieldValue, type FieldValueChange } from "../../lib/dapp-fields";
import styles from "./values.module.css";

type ChangeDiffProps = {
    rows: FieldValueChange[];
    beforeLabel: string;
    afterLabel: string;
};

export function ChangeDiff({ rows, beforeLabel, afterLabel }: ChangeDiffProps) {
    return (
        <table className={styles.diff}>
            <thead>
                <tr>
                    <th scope="col">Field</th>
                    <th scope="col">{beforeLabel}</th>
                    <th scope="col">{afterLabel}</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(({ field, before, after }) => (
                    <tr key={field}>
                        <th scope="row">{FIELD_LABELS[field]}</th>
                        <td>
                            <Side value={before} other={after} mark="del" />
                        </td>
                        <td>
                            <Side value={after} other={before} mark="ins" />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function Side({ value, other, mark: Mark }: { value: FieldValue; other: FieldValue; mark: "del" | "ins" }) {
    if (!Array.isArray(value)) return value === "" ? <span className={styles.none}>None</span> : <Mark>{value}</Mark>;
    if (value.length === 0) return <span className={styles.none}>None</span>;
    return (
        <ul className={styles.values}>
            {value.map((item) => (
                <li key={item}>
                    <code className={styles.code}>{Array.isArray(other) && other.includes(item) ? item : <Mark>{item}</Mark>}</code>
                </li>
            ))}
        </ul>
    );
}
