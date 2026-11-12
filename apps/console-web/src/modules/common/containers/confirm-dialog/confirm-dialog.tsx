import { Dialog, DialogForm } from "@frontend/design-system-react/dialog";
import { Field } from "@frontend/design-system-react/field";
import { useTranslate } from "@frontend/locale/react";
import { Trans } from "react-i18next";
import { ConfirmDialogProps, ConfirmFormProps } from "./confirm-dialog.types";
import { useConfirmForm } from "./hooks/use-confirm-form";

export function ConfirmDialog({ open, onClose, title, description, icon, tone, ...form }: ConfirmDialogProps): React.JSX.Element {
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

function ConfirmForm({
    children,
    onConfirm,
    confirmText,
    cancelLabel,
    ...actions
}: ConfirmFormProps & { onClose: () => void }): React.JSX.Element {
    const translate = useTranslate();
    const { form, canConfirm } = useConfirmForm(confirmText);

    return (
        <DialogForm
            {...actions}
            cancelLabel={cancelLabel ?? translate("confirmDialog.cancel")}
            canConfirm={canConfirm}
            onSubmit={() => void form.handleSubmit(() => onConfirm())()}
        >
            {children}
            {confirmText !== undefined && (
                <div className="[&_input]:border-danger-border">
                    <Field
                        label={
                            <Trans
                                i18nKey="confirmDialog.typeToConfirm"
                                values={{ text: confirmText }}
                                components={{ strong: <strong className="font-semibold tracking-[0.02em] text-ink normal-case" /> }}
                            />
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
        </DialogForm>
    );
}
