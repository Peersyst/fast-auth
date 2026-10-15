import { forwardRef, type ButtonHTMLAttributes, type ForwardedRef } from "react";
import styles from "./Button.module.css";
import { Spinner } from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonSize = "medium" | "small";

type ButtonLook = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonLook & { loading?: boolean };

export function buttonClassName({ variant = "primary", size = "medium", className }: ButtonLook) {
    return [styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ");
}

export const Button = forwardRef(function Button(
    { variant, size, loading = false, type = "button", className, onClick, children, ...rest }: ButtonProps,
    ref: ForwardedRef<HTMLButtonElement>,
) {
    return (
        <button
            {...rest}
            ref={ref}
            type={type}
            className={buttonClassName({ variant, size, className })}
            aria-busy={loading || undefined}
            aria-disabled={loading || undefined}
            onClick={loading ? (event) => event.preventDefault() : onClick}
        >
            {loading && <Spinner />}
            {children}
        </button>
    );
});
