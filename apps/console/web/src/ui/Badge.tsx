import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export type BadgeTone = "warning" | "success" | "danger" | "neutral" | "info";

const TONES: Record<BadgeTone, string> = {
    warning: "bg-warning-bg text-warning-ink",
    success: "bg-ok-bg text-ok-ink",
    danger: "bg-danger-bg text-danger-ink",
    neutral: "bg-surface-muted text-ink-3",
    info: "text-warning-ink inset-ring inset-ring-warning-border",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-[3px] font-mono text-xs leading-[1.5] font-semibold tracking-[0.02em] whitespace-nowrap",
                TONES[tone],
            )}
        >
            {children}
        </span>
    );
}
