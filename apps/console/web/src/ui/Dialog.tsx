import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "./Button";
import styles from "./Dialog.module.css";
import { Field } from "./Field";

type DialogTone = "ok" | "warn" | "danger";

type DialogProps = {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    tone?: DialogTone;
    busy?: boolean;
    children: ReactNode;
};

const ICON_TONES: Record<DialogTone, string | undefined> = { ok: styles.iconOk, warn: styles.iconWarn, danger: styles.iconDanger };

export function Dialog({ open, onClose, title, description, icon, tone = "ok", busy = false, children }: DialogProps) {
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

    const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            if (!busy) onClose();
        }
    };

    return (
        <dialog
            ref={ref}
            className={styles.dialog}
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
                    <div className={styles.header}>
                        {icon && (
                            <span className={`${styles.icon} ${ICON_TONES[tone]}`} aria-hidden="true">
                                {icon}
                            </span>
                        )}
                        <div className={styles.heading}>
                            <h2 id={titleId} className={styles.title}>
                                {title}
                            </h2>
                            {description && (
                                <div id={descriptionId} className={styles.description}>
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

const collapseSpaces = (text: string) => text.normalize("NFC").trim().replace(/\s+/g, " ");

type Reason = { label: ReactNode; minLength: number; maxLength: number; placeholder?: string; hint?: string };

type ConfirmFormProps = {
    children?: ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
    loading?: boolean;
    confirmText?: string;
} & (
    | {
          reason: Reason;
          onConfirm: (reason: string) => void;
      }
    | { reason?: undefined; onConfirm: () => void }
);

type ConfirmDialogProps = Omit<DialogProps, "children" | "busy"> & ConfirmFormProps;

export function ConfirmDialog({ open, onClose, title, description, icon, tone, ...form }: ConfirmDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            icon={icon}
            tone={tone ?? (form.destructive ? "danger" : "ok")}
            busy={form.loading}
        >
            <ConfirmForm onClose={onClose} {...form} />
        </Dialog>
    );
}

function ConfirmForm({ children, onConfirm, confirmText, reason, ...actions }: ConfirmFormProps & { onClose: () => void }) {
    const [typed, setTyped] = useState("");
    const [reasonText, setReasonText] = useState("");
    const trimmedReason = reasonText.trim();
    const canConfirm =
        (confirmText === undefined || collapseSpaces(typed) === collapseSpaces(confirmText)) &&
        (!reason || trimmedReason.length >= reason.minLength);

    return (
        <DialogForm
            {...actions}
            canConfirm={canConfirm}
            onSubmit={() => {
                if (reason) onConfirm(trimmedReason);
                else onConfirm();
            }}
        >
            {children}
            {confirmText !== undefined && (
                <div className={styles.confirmField}>
                    <Field
                        label={
                            <>
                                Type <strong>{confirmText}</strong> to confirm
                            </>
                        }
                    >
                        {(control) => (
                            <input
                                {...control}
                                value={typed}
                                onChange={(event) => setTyped(event.target.value)}
                                placeholder={confirmText}
                                autoComplete="off"
                                spellCheck={false}
                            />
                        )}
                    </Field>
                </div>
            )}
            {reason && (
                <Field
                    label={reason.label}
                    tag="required"
                    hint={[
                        reason.hint,
                        reasonText.length < reason.maxLength
                            ? `Between ${reason.minLength} and ${reason.maxLength} characters.`
                            : `Between ${reason.minLength} and ${reason.maxLength} characters. You've reached the limit.`,
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
                    {(control) => (
                        <textarea
                            {...control}
                            rows={4}
                            maxLength={reason.maxLength}
                            placeholder={reason.placeholder}
                            value={reasonText}
                            onChange={(event) => setReasonText(event.target.value)}
                        />
                    )}
                </Field>
            )}
        </DialogForm>
    );
}

type DialogFormProps = {
    onSubmit: () => void;
    onClose: () => void;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
    loading?: boolean;
    canConfirm?: boolean;
    children: ReactNode;
};

export function DialogForm({
    onSubmit,
    onClose,
    confirmLabel,
    cancelLabel = "Cancel",
    destructive = false,
    loading = false,
    canConfirm = true,
    children,
}: DialogFormProps) {
    return (
        <form
            className={styles.body}
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            {children}
            <div className={styles.actions}>
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
