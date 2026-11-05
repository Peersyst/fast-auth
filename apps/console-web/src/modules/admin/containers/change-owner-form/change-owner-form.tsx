import { ReactNode } from "react";
import { DialogForm } from "@frontend/design-system-react/dialog";
import { Field } from "@frontend/design-system-react/field";
import { useTranslate } from "@frontend/locale/react";
import { LocaleErrorResource } from "@frontend/locale";
import { useChangeOwnerForm } from "./hooks/use-change-owner-form";

export type ChangeOwnerFormProps = {
    onClose: () => void;
    onConfirm: (ownerEmail: string) => void;
    loading: boolean;
    children: ReactNode;
};

export function ChangeOwnerForm({ onClose, onConfirm, loading, children }: ChangeOwnerFormProps): React.JSX.Element {
    const translate = useTranslate();
    const translateError = useTranslate("error");
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useChangeOwnerForm();
    const errorKey = errors.ownerEmail?.message;

    return (
        <DialogForm
            onClose={onClose}
            confirmLabel={translate("admin.dapp.changeOwnerDialog.confirm")}
            cancelLabel={translate("confirmDialog.cancel")}
            loading={loading}
            onSubmit={() => void handleSubmit(({ ownerEmail }) => onConfirm(ownerEmail))()}
        >
            <Field
                label={translate("admin.dapp.changeOwnerDialog.email")}
                error={errorKey && translateError(errorKey as LocaleErrorResource)}
            >
                {(control) => <input {...control} {...register("ownerEmail")} type="email" autoComplete="off" />}
            </Field>
            {children}
        </DialogForm>
    );
}
