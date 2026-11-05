import { cva } from "class-variance-authority";

export const dialogIconVariants = cva("flex size-10 flex-none items-center justify-center rounded-pill", {
    variants: {
        tone: {
            ok: "bg-ok-bg text-ok-ink",
            warn: "bg-warning-bg text-warning-ink",
            danger: "bg-danger-bg text-danger-ink",
        },
    },
});
