import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmFormData, confirmFormSchema, ConfirmReason } from "../confirm-dialog.types";

export type UseConfirmFormResult = {
    form: UseFormReturn<ConfirmFormData>;
    values: ConfirmFormData;
    /**
     * Whether the typed text matches and the reason is long enough.
     */
    canConfirm: boolean;
};

/**
 * Confirmation form hook.
 * @param confirmText The text the user must type.
 * @param reason The reason's bounds.
 * @returns The form, its values and whether they confirm.
 */
export function useConfirmForm(confirmText: string | undefined, reason: ConfirmReason | undefined): UseConfirmFormResult {
    const schema = confirmFormSchema(confirmText, reason);
    const form = useForm<ConfirmFormData>({ resolver: zodResolver(schema), defaultValues: { typed: "", reason: "" } });
    const values = form.watch();
    return { form, values, canConfirm: schema.safeParse(values).success };
}
