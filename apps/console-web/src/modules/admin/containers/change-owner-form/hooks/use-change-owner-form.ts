import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChangeOwnerFormData, changeOwnerSchema } from "../../../../dapp/containers/dapp-form/dapp-form.types";

/**
 * The owner change form hook, on the same email rule as a dApp's contact.
 * @returns The form.
 */
export function useChangeOwnerForm(): UseFormReturn<ChangeOwnerFormData> {
    return useForm<ChangeOwnerFormData>({ resolver: zodResolver(changeOwnerSchema), defaultValues: { ownerEmail: "" } });
}
