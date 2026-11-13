import { Dialog, DialogForm } from "@frontend/design-system-react/dialog";
import { useTranslate } from "@frontend/locale/react";
import { ConfirmDialogProps, ConfirmFormProps } from "./confirm-dialog.types";

export function ConfirmDialog({ open, onClose, title, description, icon, ...form }: ConfirmDialogProps): React.JSX.Element {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            icon={icon}
            tone={form.destructive ? "danger" : "ok"}
            busy={form.loading}
        >
            <ConfirmForm onClose={onClose} {...form} />
        </Dialog>
    );
}

function ConfirmForm({ children, onConfirm, ...actions }: ConfirmFormProps & { onClose: () => void }): React.JSX.Element {
    const translate = useTranslate();

    return (
        <DialogForm {...actions} cancelLabel={translate("confirmDialog.cancel")} onSubmit={onConfirm}>
            {children}
        </DialogForm>
    );
}
