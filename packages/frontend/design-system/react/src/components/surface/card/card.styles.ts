import { cva } from "class-variance-authority";

export const cardClasses = {
    root: "rounded-lg border border-border bg-surface shadow-card",
    body: "grid gap-4 px-6 py-5",
};

export const cardHeaderVariants = cva(
    "flex flex-wrap items-center border-b border-b-border bg-canvas px-6 [&_h2]:font-semibold [&_h2]:tracking-[normal]",
    {
        variants: {
            variant: {
                split: "justify-between gap-2 py-[14px] [&_h2]:text-md",
                inline: "gap-3 py-4 [&_h2]:text-lg",
            },
        },
    },
);
