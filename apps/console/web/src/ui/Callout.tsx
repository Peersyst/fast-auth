import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { ErrorIcon, InfoIcon, TipIcon, WarningIcon } from "./icons";

type CalloutTone = "info" | "tip" | "warning" | "error";

type CalloutProps = {
    tone: CalloutTone;
    id?: string;
    title?: string;
    children: ReactNode;
    className?: string;
};

const ICONS = { info: InfoIcon, tip: TipIcon, warning: WarningIcon, error: ErrorIcon };

const TONES: Record<CalloutTone, string> = {
    info: "border-border bg-canvas text-ink-2",
    tip: "border-ok-border bg-ok-bg text-ok-ink",
    warning: "border-warning-border bg-warning-bg text-warning-ink",
    error: "border-danger-border bg-danger-bg text-danger-ink-strong",
};

const ICON_TONES: Partial<Record<CalloutTone, string>> = { info: "text-ink-3", error: "text-danger-ink" };

export function Callout({ tone, id, title, children, className }: CalloutProps) {
    const Icon = ICONS[tone];
    return (
        <div
            id={id}
            className={cn("flex gap-3 rounded-sm border px-4 py-3 text-sm leading-body", TONES[tone], className)}
            role={tone === "error" ? "alert" : undefined}
        >
            <span className={cn("flex flex-none", ICON_TONES[tone])}>
                <Icon />
            </span>
            <div className="flex min-w-0 flex-col gap-2 wrap-anywhere">
                {title && <p className="font-semibold">{title}</p>}
                {children}
            </div>
        </div>
    );
}
