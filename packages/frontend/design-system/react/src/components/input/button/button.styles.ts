import { cva } from "class-variance-authority";
import { cn } from "../../../utils";
import { ButtonLook } from "./button.types";

export const buttonVariants = cva(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill border py-0 tracking-[-0.01em] no-underline transition-[background,border-color] duration-120 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed",
    {
        variants: {
            variant: {
                primary:
                    "border-transparent bg-accent font-semibold text-on-accent shadow-card not-disabled:not-aria-disabled:hover:bg-accent-hover",
                secondary: "border-border bg-surface font-medium text-ink not-disabled:not-aria-disabled:hover:bg-surface-muted",
                danger: "border-danger-border bg-surface font-semibold text-danger-ink not-disabled:not-aria-disabled:hover:bg-danger-bg",
            },
            size: {
                medium: "min-h-control px-5 text-md",
                small: "min-h-8 px-3 text-sm",
            },
        },
    },
);

/**
 * The class name of a button, for elements that look like one, such as a link.
 * @param look The button's variant, size and extra class name.
 * @returns The class name.
 */
export function buttonClassName({ variant = "primary", size = "medium", className }: ButtonLook): string {
    return cn(buttonVariants({ variant, size }), className);
}
