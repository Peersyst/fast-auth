import { useEffect, useId, useRef, KeyboardEvent } from "react";
import { Button } from "../../input/button";
import { dialogIconVariants } from "./dialog.styles";
import { DialogFormProps, DialogProps } from "./dialog.types";

export function Dialog({ open, onClose, title, description, icon, tone = "ok", busy = false, children }: DialogProps): React.JSX.Element {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = `${titleId}-description`;

    useEffect(() => {
        const dialog = ref.current;
        if (!open || !dialog) return;
        const previous = document.activeElement;
        dialog.showModal();
        return () => {
            dialog.close();
            if (previous instanceof HTMLElement) previous.focus();
        };
    }, [open]);

    const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>): void => {
        if (event.key === "Escape") {
            event.preventDefault();
            if (!busy) onClose();
        }
    };

    return (
        <dialog
            ref={ref}
            className="w-[min(520px,calc(100vw_-_32px))] rounded-lg border-0 bg-surface p-7 text-md leading-[1.5] text-ink shadow-modal backdrop:bg-backdrop"
            aria-labelledby={titleId}
            aria-describedby={open && description ? descriptionId : undefined}
            onKeyDown={handleKeyDown}
            onCancel={(event) => {
                event.preventDefault();
                if (!busy) onClose();
            }}
            onClose={(event) => {
                if (open) event.currentTarget.showModal();
            }}
        >
            {open && (
                <>
                    <div className="mb-5 flex gap-3.5">
                        {icon && (
                            <span className={dialogIconVariants({ tone })} aria-hidden="true">
                                {icon}
                            </span>
                        )}
                        <div className="flex min-w-0 flex-col gap-1">
                            <h2 id={titleId} className="m-0 text-xl leading-[1.3] font-bold tracking-tight wrap-anywhere">
                                {title}
                            </h2>
                            {description && (
                                <div
                                    id={descriptionId}
                                    className="text-base text-ink-subtle wrap-anywhere [&_code]:font-mono [&_code]:text-sm [&_code]:text-ink [&_strong]:font-semibold [&_strong]:text-ink"
                                >
                                    {description}
                                </div>
                            )}
                        </div>
                    </div>
                    {children}
                </>
            )}
        </dialog>
    );
}

export function DialogForm({
    onSubmit,
    onClose,
    confirmLabel,
    cancelLabel,
    destructive = false,
    loading = false,
    canConfirm = true,
    children,
}: DialogFormProps): React.JSX.Element {
    return (
        <form
            className="grid gap-5"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            {children}
            <div className="flex flex-wrap justify-end gap-2.5 pt-1">
                <Button variant="secondary" disabled={loading} onClick={onClose}>
                    {cancelLabel}
                </Button>
                <Button type="submit" variant={destructive ? "danger" : "primary"} disabled={!canConfirm} loading={loading}>
                    {confirmLabel}
                </Button>
            </div>
        </form>
    );
}
