import { forwardRef, type ButtonHTMLAttributes, type ForwardedRef } from "react";
import styles from "./Button.module.css";
import { Spinner } from "./Spinner";

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
            className={[styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ")}
            aria-busy={loading || undefined}
            aria-disabled={loading || undefined}
            onClick={loading ? (event) => event.preventDefault() : onClick}
        >
            {loading && <Spinner />}
            {children}
        </button>
    );
});
