import { cva } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type ForwardedRef } from "react";
import { cn } from "../lib/cn";
import { Spinner } from "./Spinner";

const buttonVariants = cva(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill border py-0 tracking-[-0.01em] transition-[background,border-color] duration-120 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed",
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

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonSize = "medium" | "small";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
};

export const Button = forwardRef(function Button(
    { variant = "primary", size = "medium", loading = false, type = "button", className, onClick, children, ...rest }: ButtonProps,
    ref: ForwardedRef<HTMLButtonElement>,
) {
    return (
        <button
            {...rest}
            ref={ref}
            type={type}
            className={cn(buttonVariants({ variant, size }), className)}
            aria-busy={loading || undefined}
            aria-disabled={loading || undefined}
            onClick={loading ? (event) => event.preventDefault() : onClick}
        >
            {loading && <Spinner />}
            {children}
        </button>
    );
});
