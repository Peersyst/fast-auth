import { useTranslate } from "@frontend/locale/react";
import { FieldValue, FieldValueChange } from "@shared/modules/dapp";
import { NoValue, valueClassNames } from "../field-values/field-values";

const CELL = "border-b border-b-border px-3 py-2.5 text-left align-top wrap-anywhere";
const HEADING = `${CELL} font-mono text-2xs font-medium tracking-kicker text-ink-subtle uppercase`;
const MARKS = { del: "bg-danger-bg text-danger-ink", ins: "bg-ok-bg text-ok-ink no-underline" };

export type ChangeDiffProps = {
    rows: FieldValueChange[];
    beforeLabel: string;
    afterLabel: string;
};

export function ChangeDiff({ rows, beforeLabel, afterLabel }: ChangeDiffProps): React.JSX.Element {
    const translate = useTranslate();
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
