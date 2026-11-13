import { useId } from "react";
import { fieldClasses } from "./field.styles";
import { FieldProps } from "./field.types";

export function Field({ label, tag, tagText, hint, error, children }: FieldProps): React.JSX.Element {
    const id = useId();
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ");

    return (
        <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
                <label htmlFor={id} className={fieldClasses.label}>
                    {label}
                </label>
                {tag && <span className={fieldClasses[tag]}>{tagText}</span>}
            </div>
            {hint && (
                <p id={hintId} className={fieldClasses.hint}>
                    {hint}
                </p>
            )}
            {children({
                id,
                className: fieldClasses.control,
                "aria-describedby": describedBy || undefined,
                "aria-invalid": error ? true : undefined,
                "aria-required": tag === "required" || undefined,
            })}
            {error && (
                <p id={errorId} className={fieldClasses.error} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
