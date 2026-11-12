import { ReactNode } from "react";

export type DialogTone = "ok" | "warn" | "danger";

export type DialogProps = {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    tone?: DialogTone;
    /**
     * While busy, Escape and the browser's cancel do not close the dialog.
     */
    busy?: boolean;
    children: ReactNode;
};

export type DialogFormProps = {
    onSubmit: () => void;
    onClose: () => void;
    confirmLabel: ReactNode;
    cancelLabel: ReactNode;
    destructive?: boolean;
    loading?: boolean;
    canConfirm?: boolean;
    children: ReactNode;
};
