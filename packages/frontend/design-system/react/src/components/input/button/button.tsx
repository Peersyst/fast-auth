import { forwardRef, ForwardedRef } from "react";
import { Spinner } from "../../feedback/spinner";
import { buttonClassName } from "./button.styles";
import { ButtonProps } from "./button.types";

export const Button = forwardRef(function Button(
    { variant, size, loading = false, type = "button", className, onClick, children, ...rest }: ButtonProps,
    ref: ForwardedRef<HTMLButtonElement>,
): React.JSX.Element {
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
