import { ReactNode } from "react";
import { useTranslate } from "@frontend/locale/react";
import { FieldValue } from "@shared/modules/dapp";

export const valueClassNames = {
    none: "text-ink-subtle",
    values: "m-0 flex list-none flex-col gap-1 p-0",
    code: "font-mono text-sm wrap-anywhere",
};

const FIELDS = "m-0 grid overflow-hidden bg-surface text-base";
const FIELD_ROW =
    "grid grid-cols-[minmax(120px,200px)_minmax(0,1fr)] [&+&]:border-t [&+&]:border-t-border [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:px-6 [&_dd]:py-[14px] [&_dd]:wrap-anywhere [&_dt]:px-6 [&_dt]:py-[14px] [&_dt]:font-mono [&_dt]:text-2xs [&_dt]:font-medium [&_dt]:tracking-kicker [&_dt]:text-ink-subtle [&_dt]:uppercase max-[560px]:grid-cols-[minmax(0,1fr)] max-[560px]:[&_dd]:pt-1 max-[560px]:[&_dt]:pb-0";

export type FieldRow = [label: string, value: ReactNode];

export type FieldListClassNames = { list: string; row?: string };

export type FieldListProps = {
    rows: FieldRow[];
    classNames?: FieldListClassNames;
};

export function FieldList({ rows, classNames = { list: FIELDS, row: FIELD_ROW } }: FieldListProps): React.JSX.Element {
    return (
        <dl className={classNames.list}>
            {rows.map(([label, value]) => (
                <div key={label} className={classNames.row}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                </div>
            ))}
        </dl>
    );
}

export function NoValue(): React.JSX.Element {
    const translate = useTranslate();
    return <span className={valueClassNames.none}>{translate("dapp.none")}</span>;
}

export type ValueProps = {
    value: FieldValue;
    code?: boolean;
};

export function Value({ value, code = false }: ValueProps): React.JSX.Element {
    if (value.length === 0) return <NoValue />;
    const text = (item: string): ReactNode => (code ? <code className={valueClassNames.code}>{item}</code> : item);
    if (!Array.isArray(value)) return <>{text(value)}</>;
    return (
        <ul className={valueClassNames.values}>
            {value.map((item) => (
                <li key={item}>{text(item)}</li>
            ))}
        </ul>
    );
}
