import { FIELD_LABELS } from "@shared/console-domain/dapp";
import type { FieldValue } from "@shared/console-domain/dapp-event";
import type { FieldValueChange } from "@shared/console-domain/dapp-edits";
import { valueClasses } from "./FieldValues";

const CELL = "border-b border-b-border px-3 py-2.5 text-left align-top wrap-anywhere";
const HEADING = `${CELL} font-mono text-[11px] font-medium tracking-kicker text-ink-subtle uppercase`;
const MARKS = { del: "bg-danger-bg text-danger-ink", ins: "bg-ok-bg text-ok-ink no-underline" };

type ChangeDiffProps = {
    rows: FieldValueChange[];
    beforeLabel: string;
    afterLabel: string;
};

export function ChangeDiff({ rows, beforeLabel, afterLabel }: ChangeDiffProps) {
    return (
        <table className="w-full table-fixed border-collapse text-[14px]">
            <thead>
                <tr>
                    <th scope="col" className={`${HEADING} w-[25%]`}>
                        Field
                    </th>
                    <th scope="col" className={HEADING}>
                        {beforeLabel}
                    </th>
                    <th scope="col" className={HEADING}>
                        {afterLabel}
                    </th>
                </tr>
            </thead>
            <tbody>
                {rows.map(({ field, before, after }) => (
                    <tr key={field}>
                        <th scope="row" className={HEADING}>
                            {FIELD_LABELS[field]}
                        </th>
                        <td className={CELL}>
                            <Side value={before} other={after} mark="del" />
                        </td>
                        <td className={CELL}>
                            <Side value={after} other={before} mark="ins" />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function Side({ value, other, mark: Mark }: { value: FieldValue; other: FieldValue; mark: "del" | "ins" }) {
    if (!Array.isArray(value))
        return value === "" ? <span className={valueClasses.none}>None</span> : <Mark className={MARKS[Mark]}>{value}</Mark>;
    if (value.length === 0) return <span className={valueClasses.none}>None</span>;
    return (
        <ul className={valueClasses.values}>
            {value.map((item) => (
                <li key={item}>
                    <code className={valueClasses.code}>
                        {Array.isArray(other) && other.includes(item) ? item : <Mark className={MARKS[Mark]}>{item}</Mark>}
                    </code>
                </li>
            ))}
        </ul>
    );
}
