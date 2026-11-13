import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateDappRequest, DappDto } from "@shared/console";
import { DappFormInput, dappFormSchema } from "../dapp-form.types";

/**
 * The form's starting values: empty for a new dApp, or the dApp's own with its change under review when one waits.
 * @param dapp The dApp being edited, if any.
 * @returns The default values.
 */
function toFormInput(dapp: DappDto | null): DefaultValues<DappFormInput> {
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
    const change = dapp.pendingChange;
    const rows = (list: string[]): { value: string }[] => list.map((value) => ({ value }));
    return {
        name: change?.name ?? dapp.name,
        description: change?.description ?? dapp.description,
        logoUrl: change?.logoUrl ?? dapp.logoUrl,
        mauBracket: change?.mauBracket ?? dapp.mauBracket,
        callbackUrls: rows(change?.callbackUrls ?? dapp.callbackUrls),
        logoutUrls: rows(change?.logoutUrls ?? dapp.logoutUrls),
        webOrigins: rows(change?.webOrigins ?? dapp.webOrigins),
        contactEmail: change?.contactEmail ?? dapp.contactEmail,
    };
}

/**
 * The dApp form hook.
 * @param dapp The dApp being edited, or `null` for a new one.
 * @returns The form, whose output is the request the API takes.
 */
export function useDappForm(dapp: DappDto | null): UseFormReturn<DappFormInput, unknown, CreateDappRequest> {
    return useForm<DappFormInput, unknown, CreateDappRequest>({
        resolver: zodResolver(dappFormSchema),
        defaultValues: toFormInput(dapp),
    });
}
