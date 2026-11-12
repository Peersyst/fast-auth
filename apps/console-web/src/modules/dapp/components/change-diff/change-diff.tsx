import { useTranslate } from "@frontend/locale/react";
import { DAPP_FIELDS, DappField, DappFields, diffFields, FieldValue, MauBracket } from "@shared/modules/dapp";
import { NoValue, valueClassNames } from "../field-values/field-values";

const CELL = "border-b border-b-border px-3 py-2.5 text-left align-top wrap-anywhere";
const HEADING = `${CELL} font-mono text-2xs font-medium tracking-kicker text-ink-subtle uppercase`;
const MARKS = { del: "bg-danger-bg text-danger-ink", ins: "bg-ok-bg text-ok-ink no-underline" };
const MAU_BRACKETS: readonly string[] = Object.values(MauBracket);

type ChangeDiffRow = { field: DappField; before: FieldValue; after: FieldValue };

/**
 * Whether a value is an expected-MAU bracket.
 * @param value The value.
 * @returns `true` for a bracket.
 */
function isMauBracket(value: string): value is MauBracket {
    return MAU_BRACKETS.includes(value);
}

/**
 * Lists the fields a pending change changes, with the live and proposed value of each, the contact email's included.
 * @param live The live fields.
 * @param change The pending change.
 * @returns The rows.
 */
export function pendingChangeRows(live: DappFields, change: DappFields): ChangeDiffRow[] {
    return diffFields(DAPP_FIELDS, live, change).map(({ field }) => ({ field, before: live[field], after: change[field] }));
}

export type ChangeDiffProps = {
    rows: ChangeDiffRow[];
    beforeLabel: string;
    afterLabel: string;
};

export function ChangeDiff({ rows, beforeLabel, afterLabel }: ChangeDiffProps): React.JSX.Element {
    const translate = useTranslate();
    const shown = (field: DappField, value: FieldValue): FieldValue =>
        field === "mauBracket" && typeof value === "string" && isMauBracket(value) ? translate(`dapp.mau.${value}`) : value;
    return (
        <table className="w-full table-fixed border-collapse text-base">
            <thead>
                <tr>
                    <th scope="col" className={`${HEADING} w-[25%]`}>
                        {translate("dapp.diff.field")}
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
                            {translate(`dapp.fields.${field}`)}
                        </th>
                        <td className={CELL}>
                            <Side value={shown(field, before)} other={after} mark="del" />
                        </td>
                        <td className={CELL}>
                            <Side value={shown(field, after)} other={before} mark="ins" />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

type SideProps = {
    value: FieldValue;
    other: FieldValue;
    mark: "del" | "ins";
};

function Side({ value, other, mark: Mark }: SideProps): React.JSX.Element {
    if (!Array.isArray(value)) return value === "" ? <NoValue /> : <Mark className={MARKS[Mark]}>{value}</Mark>;
    if (value.length === 0) return <NoValue />;
    return (
        <ul className={valueClassNames.values}>
            {value.map((item) => (
                <li key={item}>
                    <code className={valueClassNames.code}>
                        {Array.isArray(other) && other.includes(item) ? item : <Mark className={MARKS[Mark]}>{item}</Mark>}
                    </code>
                </li>
            ))}
        </ul>
    );
}
