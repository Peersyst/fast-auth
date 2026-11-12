import { cva } from "class-variance-authority";

export const calloutVariants = cva("flex gap-3 rounded-sm border px-4 py-3 text-sm leading-body", {
    variants: {
        tone: {
            info: "border-border bg-canvas text-ink-2",
            tip: "border-ok-border bg-ok-bg text-ok-ink",
            warning: "border-warning-border bg-warning-bg text-warning-ink",
            error: "border-danger-border bg-danger-bg text-danger-ink-strong",
        },
    },
});

export const calloutIconVariants = cva("flex flex-none", {
    variants: {
        tone: {
            info: "text-ink-3",
            tip: "",
            warning: "",
            error: "text-danger-ink",
        },
    },
});
