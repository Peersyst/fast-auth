import { ReactNode } from "react";
import { DialogProps } from "@frontend/design-system-react/dialog";

export type ConfirmFormProps = {
    children?: ReactNode;
    confirmLabel: ReactNode;
    destructive?: boolean;
    loading?: boolean;
    onConfirm: () => void;
};

export type ConfirmDialogProps = Omit<DialogProps, "children" | "busy" | "tone"> & ConfirmFormProps;
