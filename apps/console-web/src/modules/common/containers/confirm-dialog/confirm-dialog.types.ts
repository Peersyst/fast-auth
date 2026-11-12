import { ReactNode } from "react";
import { z } from "zod";
import { DialogProps } from "@frontend/design-system-react/dialog";

export type ConfirmFormProps = {
    children?: ReactNode;
    confirmLabel: ReactNode;
    cancelLabel?: ReactNode;
    destructive?: boolean;
    loading?: boolean;
    /**
     * Text the user must type, such as the dApp's name, before they can confirm.
     */
    confirmText?: string;
    onConfirm: () => void;
};

export type ConfirmDialogProps = Omit<DialogProps, "children" | "busy"> & ConfirmFormProps;

/**
 * Compares typed text as a person reads it: composed, trimmed, with each run of spaces as one.
 * @param text The text.
 * @returns The text to compare.
 */
function collapseSpaces(text: string): string {
    return text.normalize("NFC").trim().replace(/\s+/g, " ");
}

/**
 * Builds the schema of a confirmation: the typed text, when one is asked for.
 * @param confirmText The text the user must type.
 * @returns The schema.
 */
export function confirmFormSchema(confirmText: string | undefined) {
    return z.object({
        typed: z.string().refine((typed) => confirmText === undefined || collapseSpaces(typed) === collapseSpaces(confirmText)),
    });
}

export type ConfirmFormData = z.infer<ReturnType<typeof confirmFormSchema>>;
