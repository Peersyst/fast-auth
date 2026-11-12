import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmFormData, confirmFormSchema } from "../confirm-dialog.types";

export type UseConfirmFormResult = {
    form: UseFormReturn<ConfirmFormData>;
    /**
     * Whether the typed text matches.
     */
    canConfirm: boolean;
};

/**
 * Confirmation form hook.
 * @param confirmText The text the user must type.
 * @returns The form and whether its values confirm.
 */
export function useConfirmForm(confirmText: string | undefined): UseConfirmFormResult {
    const schema = confirmFormSchema(confirmText);
    const form = useForm<ConfirmFormData>({ resolver: zodResolver(schema), defaultValues: { typed: "" } });
    const values = form.watch();
    return { form, canConfirm: schema.safeParse(values).success };
}
