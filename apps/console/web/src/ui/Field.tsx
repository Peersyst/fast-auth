import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";

const TAG_TONES = { required: "text-danger-ink", optional: "text-ink-subtle" } as const;

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
                <label htmlFor={id} className="font-mono text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
                    {label}
                </label>
                {tag && <span className={cn("font-mono text-[10px] font-medium tracking-kicker uppercase", TAG_TONES[tag])}>{tag}</span>}
            </div>
            {hint && (
                <p id={hintId} className="text-sm text-ink-subtle">
                    {hint}
                </p>
            )}
            {children({
                id,
                className:
                    "h-control w-full rounded-[12px] border border-border-strong bg-surface px-3 py-0 text-[14px] text-ink placeholder:text-faint aria-invalid:border-danger-ink [textarea&]:h-auto [textarea&]:resize-y [textarea&]:py-[10px]",
                "aria-describedby": describedBy || undefined,
                "aria-invalid": error ? true : undefined,
                "aria-required": tag === "required" || undefined,
            })}
            {error && (
                <p id={errorId} className="text-sm text-danger-ink" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
