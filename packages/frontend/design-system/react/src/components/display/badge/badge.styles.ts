import { cva } from "class-variance-authority";

export const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-[3px] font-mono text-xs leading-[1.5] font-semibold tracking-[0.02em] whitespace-nowrap",
    {
        variants: {
            tone: {
                warning: "bg-warning-bg text-warning-ink",
                success: "bg-ok-bg text-ok-ink",
                danger: "bg-danger-bg text-danger-ink",
                neutral: "bg-surface-muted text-ink-3",
                info: "text-warning-ink inset-ring inset-ring-warning-border",
            },
        },
    },
);
