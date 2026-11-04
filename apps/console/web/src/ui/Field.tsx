import { useId, type ReactNode } from "react";

const TAG = "font-mono text-[10px] font-medium tracking-kicker uppercase";

export const fieldClasses = {
    label: "font-mono text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase",
    required: `${TAG} text-danger-ink`,
    optional: `${TAG} text-ink-subtle`,
    hint: "text-sm text-ink-subtle",
    control:
        "h-control w-full rounded-[12px] border border-border-strong bg-surface px-3 py-0 text-[14px] text-ink placeholder:text-faint aria-invalid:border-danger-ink [textarea&]:h-auto [textarea&]:resize-y [textarea&]:py-[10px]",
    error: "text-sm text-danger-ink",
};

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
        <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
                <label htmlFor={id} className={fieldClasses.label}>
                    {label}
                </label>
                {tag && <span className={fieldClasses[tag]}>{tag}</span>}
            </div>
            {hint && (
                <p id={hintId} className={fieldClasses.hint}>
                    {hint}
                </p>
            )}
            {children({
                id,
                className: fieldClasses.control,
                "aria-describedby": describedBy || undefined,
                "aria-invalid": error ? true : undefined,
                "aria-required": tag === "required" || undefined,
            })}
            {error && (
                <p id={errorId} className={fieldClasses.error} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
