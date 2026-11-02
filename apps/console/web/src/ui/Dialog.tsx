import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "../lib/cn";
import { Button } from "./Button";
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

const ICON_TONES: Record<DialogTone, string> = {
    ok: "bg-ok-bg text-ok-ink",
    warn: "bg-warning-bg text-warning-ink",
    danger: "bg-danger-bg text-danger-ink",
};

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
                            <span
                                className={cn("flex size-10 flex-none items-center justify-center rounded-pill", ICON_TONES[tone])}
                                aria-hidden="true"
                            >
                                {icon}
                            </span>
                        )}
                        <div className="flex min-w-0 flex-col gap-1">
                            <h2 id={titleId} className="m-0 text-[20px] leading-[1.3] font-bold tracking-tight wrap-anywhere">
                                {title}
                            </h2>
                            {description && (
                                <div
                                    id={descriptionId}
                                    className="text-[14px] text-ink-subtle wrap-anywhere [&_code]:font-mono [&_code]:text-sm [&_code]:text-ink [&_strong]:font-semibold [&_strong]:text-ink"
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

function confirmFormSchema(confirmText: string | undefined, reason: Reason | undefined) {
    return z.object({
        typed: z.string().refine((typed) => confirmText === undefined || collapseSpaces(typed) === collapseSpaces(confirmText)),
        reason: z
            .string()
            .trim()
            .min(reason?.minLength ?? 0),
    });
}

type ConfirmFormValues = z.infer<ReturnType<typeof confirmFormSchema>>;

function ConfirmForm({ children, onConfirm, confirmText, reason, ...actions }: ConfirmFormProps & { onClose: () => void }) {
    const schema = confirmFormSchema(confirmText, reason);
    const form = useForm<ConfirmFormValues>({ resolver: zodResolver(schema), defaultValues: { typed: "", reason: "" } });
    const values = form.watch();

    return (
        <DialogForm
            {...actions}
            canConfirm={schema.safeParse(values).success}
            onSubmit={() =>
                void form.handleSubmit((confirmed) => {
                    if (reason) onConfirm(confirmed.reason);
                    else onConfirm();
                })()
            }
        >
            {children}
            {confirmText !== undefined && (
                <div className="[&_input]:border-danger-border">
                    <Field
                        label={
                            <>
                                Type <strong className="font-semibold tracking-[0.02em] text-ink normal-case">{confirmText}</strong> to
                                confirm
                            </>
                        }
                    >
                        {(control) => (
                            <input
                                {...control}
                                {...form.register("typed")}
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
                        values.reason.length < reason.maxLength
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
                            {...form.register("reason")}
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
