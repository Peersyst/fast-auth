import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpsertDappRequest } from "@shared/console";
import { DappFormInput, dappFormSchema, EditedDapp } from "../dapp-form.types";

/**
 * The form's starting values: empty for a new dApp, or the dApp's own with its change under review when one waits.
 * @param dapp The dApp being edited, if any.
 * @param showPendingChange Whether to show the change under review instead of the live values.
 * @returns The default values.
 */
function toFormInput(dapp: EditedDapp | null, showPendingChange: boolean): DefaultValues<DappFormInput> {
    if (!dapp) {
        return {
            name: "",
            description: "",
            logoUrl: "",
            callbackUrls: [{ value: "" }],
            logoutUrls: [],
            webOrigins: [{ value: "" }],
            contactEmail: "",
        };
    }
    const fields = showPendingChange && dapp.pendingChange ? { ...dapp, ...dapp.pendingChange } : dapp;
    const rows = (list: string[]): { value: string }[] => list.map((value) => ({ value }));
    return {
        name: fields.name,
        description: fields.description,
        logoUrl: fields.logoUrl,
        mauBracket: fields.mauBracket,
        callbackUrls: rows(fields.callbackUrls),
        logoutUrls: rows(fields.logoutUrls),
        webOrigins: rows(fields.webOrigins),
        contactEmail: fields.contactEmail,
    };
}

/**
 * The dApp form hook.
 * @param dapp The dApp being edited, or `null` for a new one.
 * @param showPendingChange Whether to start from the change under review.
 * @returns The form, whose output is the request the API takes.
 */
export function useDappForm(dapp: EditedDapp | null, showPendingChange: boolean): UseFormReturn<DappFormInput, unknown, UpsertDappRequest> {
    return useForm<DappFormInput, unknown, UpsertDappRequest>({
        resolver: zodResolver(dappFormSchema),
        defaultValues: toFormInput(dapp, showPendingChange),
    });
}
