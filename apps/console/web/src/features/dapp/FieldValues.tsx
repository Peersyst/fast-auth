import type { ReactNode } from "react";
import type { FieldValue } from "@shared/console-domain/dapp-event";

export const valueClasses = {
    none: "text-ink-subtle",
    values: "m-0 flex list-none flex-col gap-1 p-0",
    code: "font-mono text-sm wrap-anywhere",
};

const FIELDS = "m-0 grid overflow-hidden bg-surface text-[14px]";
const FIELD_ROW =
    "grid grid-cols-[minmax(120px,200px)_minmax(0,1fr)] [&+&]:border-t [&+&]:border-t-border [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:px-6 [&_dd]:py-[14px] [&_dd]:wrap-anywhere [&_dt]:px-6 [&_dt]:py-[14px] [&_dt]:font-mono [&_dt]:text-[11px] [&_dt]:font-medium [&_dt]:tracking-kicker [&_dt]:text-ink-subtle [&_dt]:uppercase max-[560px]:grid-cols-[minmax(0,1fr)] max-[560px]:[&_dd]:pt-1 max-[560px]:[&_dt]:pb-0";

export type FieldRow = [label: string, value: ReactNode];

type FieldListClasses = { list: string; row?: string };

export function FieldList({ rows, classes = { list: FIELDS, row: FIELD_ROW } }: { rows: FieldRow[]; classes?: FieldListClasses }) {
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
    if (value.length === 0) return <span className={valueClasses.none}>None</span>;
    const text = (item: string) => (code ? <code className={valueClasses.code}>{item}</code> : item);
    if (!Array.isArray(value)) return text(value);
    return (
        <ul className={valueClasses.values}>
            {value.map((item) => (
                <li key={item}>{text(item)}</li>
            ))}
        </ul>
    );
}
