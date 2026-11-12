import { ReactNode, useState } from "react";
import { Trans } from "react-i18next";
import { Button } from "@frontend/design-system-react/button";
import { Callout } from "@frontend/design-system-react/callout";
import { Field } from "@frontend/design-system-react/field";
import { cn } from "@frontend/design-system-react/utils";
import { isDomainError } from "@frontend/core/domain/error";
import { ConsoleDappErrors } from "@frontend/console-dapp/domain/errors";
import { useTranslate } from "@frontend/locale/react";
import { LocaleErrorResource } from "@frontend/locale";
import { DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH } from "@shared/modules/dapp";
import { useErrorMessage } from "../../../common/hooks/use-error-message";
import { DAPP_FORM_ERROR_VALUES, DappFormField, DappFormProps, MAU_BRACKETS } from "./dapp-form.types";
import { useDappForm } from "./hooks/use-dapp-form";
import { UrlListField } from "./url-list-field/url-list-field";

const SECTION =
    "m-0 flex min-w-0 flex-col gap-6 border-0 p-0 [&_h2]:text-2xl [&_h2]:leading-[1.5] [&_h2]:font-bold [&_h2]:tracking-[-0.015em] [&>legend]:w-full [&>legend]:p-0";
const SECTION_HINT = "mt-1 border-b border-b-border pb-3 text-base text-ink-subtle";
const CODE = "rounded-[4px] bg-surface-muted px-[5px] py-px font-mono text-sm";

/**
 * The errors whose cause a reload of the dApp shows, so the form offers one.
 */
const RELOAD_ERRORS = new Set<string>([
    ConsoleDappErrors.DAPP_CHANGED,
    ConsoleDappErrors.DAPP_NOT_FOUND,
    ConsoleDappErrors.DAPP_ALREADY_EXISTS,
    ConsoleDappErrors.INVALID_TRANSITION,
]);

export function DappForm({ mode, values, saveLabel, saveHint, onSave, onCancel, onReload, onRemove }: DappFormProps): React.JSX.Element {
    const translate = useTranslate();
    const translateError = useTranslate("error");
    const reviewed = mode === "owner" && values?.status === "approved";
    const form = useDappForm(values, reviewed);
    const { register, formState } = form;
    const { errors } = formState;
    const [saveError, setSaveError] = useState<unknown>(null);
    const saveErrorMessage = useErrorMessage(saveError);
    const fieldError = (field: DappFormField): string | undefined => {
        const key = errors[field]?.message;
        return key && translateError(key as LocaleErrorResource, DAPP_FORM_ERROR_VALUES[field]);
    };
    const synced = (hint?: ReactNode): ReactNode => (
        <>
            {reviewed && <span className="font-semibold text-warning-ink">{translate("dappForm.waitsForReview")}</span>}
            {hint}
        </>
    );
    const tag = (kind: "required" | "optional"): { tag: "required" | "optional"; tagText: string } => ({
        tag: kind,
        tagText: translate(`dappForm.${kind}`),
    });

    const submit = form.handleSubmit(async (fields) => {
        setSaveError(null);
        try {
            await onSave(fields);
        } catch (error) {
            setSaveError(error);
        }
    });

    return (
        <form className="flex min-w-0 flex-col gap-10" noValidate onSubmit={(event) => void submit(event)}>
            {mode === "admin" && values?.status === "approved" && (
                <Callout tone="warning" title={translate("dappForm.liveTitle")}>
                    <p>{translate("dappForm.liveDescription")}</p>
                </Callout>
            )}

            <fieldset className={SECTION}>
                <legend>
                    <h2>{translate("dappForm.application.title")}</h2>
                </legend>
                <p className={SECTION_HINT}>{translate("dappForm.application.hint")}</p>
                <Field
                    label={translate("dappForm.name.label")}
                    {...tag("required")}
                    hint={synced(<Trans i18nKey="dappForm.name.hint" values={{ max: NAME_MAX_LENGTH }} components={{ em: <em /> }} />)}
                    error={fieldError("name")}
                >
                    {(control) => (
                        <input {...control} {...register("name")} autoComplete="off" placeholder={translate("dappForm.name.placeholder")} />
                    )}
                </Field>
                <Field
                    label={translate("dappForm.description.label")}
                    {...tag("optional")}
                    hint={synced(translate("dappForm.description.hint", { max: DESCRIPTION_MAX_LENGTH }))}
                    error={fieldError("description")}
                >
                    {(control) => (
                        <textarea
                            {...control}
                            {...register("description")}
                            rows={3}
                            placeholder={translate("dappForm.description.placeholder")}
                        />
                    )}
                </Field>
                <Field
                    label={translate("dappForm.logoUrl.label")}
                    {...tag("required")}
                    hint={synced(translate("dappForm.logoUrl.hint"))}
                    error={fieldError("logoUrl")}
                >
                    {(control) => (
                        <input {...control} {...register("logoUrl")} type="url" placeholder={translate("dappForm.logoUrl.placeholder")} />
                    )}
                </Field>
            </fieldset>

            <fieldset className={SECTION}>
                <legend>
                    <h2>{translate("dappForm.capacity.title")}</h2>
                </legend>
                <p className={SECTION_HINT}>{translate("dappForm.capacity.hint")}</p>
                <Field label={translate("dappForm.mauBracket.label")} {...tag("required")} error={fieldError("mauBracket")}>
                    {(control) => (
                        <select {...control} className={cn(control.className, "max-w-[320px]")} {...register("mauBracket")}>
                            {!values && <option value="">{translate("dappForm.mauBracket.choose")}</option>}
                            {MAU_BRACKETS.map((bracket) => (
                                <option key={bracket} value={bracket}>
                                    {translate(`dapp.mau.${bracket}`)}
                                </option>
                            ))}
                        </select>
                    )}
                </Field>
            </fieldset>

            <fieldset className={SECTION}>
                <legend>
                    <h2>{translate("dappForm.urls.title")}</h2>
                </legend>
                <p className={SECTION_HINT}>{translate("dappForm.urls.hint")}</p>
                <Callout tone="warning">
                    <p>
                        <Trans
                            i18nKey="dappForm.urls.https"
                            components={{ strong: <strong />, code: <code className="font-mono text-sm" /> }}
                        />
                    </p>
                </Callout>
                <UrlListField
                    form={form}
                    name="callbackUrls"
                    hint={synced(<Trans i18nKey="dappForm.callbackUrls.hint" components={{ code: <code className={CODE} /> }} />)}
                />
                <UrlListField
                    form={form}
                    name="logoutUrls"
                    hint={synced(<Trans i18nKey="dappForm.logoutUrls.hint" components={{ code: <code className={CODE} /> }} />)}
                />
                <UrlListField form={form} name="webOrigins" hint={synced(translate("dappForm.webOrigins.hint"))} />
            </fieldset>

            <fieldset className={SECTION}>
                <legend>
                    <h2>{translate("dappForm.contact.title")}</h2>
                </legend>
                <p className={SECTION_HINT}>{translate("dappForm.contact.hint")}</p>
                <Field
                    label={translate("dappForm.contactEmail.label")}
                    {...tag("required")}
                    hint={<Trans i18nKey="dappForm.contactEmail.hint" components={{ em: <em /> }} />}
                    error={fieldError("contactEmail")}
                >
                    {(control) => (
                        <input
                            {...control}
                            className={cn(control.className, "max-w-[420px]")}
                            {...register("contactEmail")}
                            type="email"
                            autoComplete="email"
                            placeholder={translate("dappForm.contactEmail.placeholder")}
                        />
                    )}
                </Field>
            </fieldset>

            {saveError !== null && (
                <Callout tone="error" title={translate("dappForm.notSaved")}>
                    <p>{saveErrorMessage}</p>
                    {onReload && isDomainError(saveError) && RELOAD_ERRORS.has(saveError.message) && (
                        <div>
                            <Button variant="secondary" onClick={onReload}>
                                {translate("dappForm.reload")}
                            </Button>
                        </div>
                    )}
                </Callout>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-t-border pt-6">
                <Button type="submit" loading={formState.isSubmitting}>
                    {saveLabel}
                </Button>
                <Button variant="secondary" onClick={onCancel}>
                    {translate("dappForm.cancel")}
                </Button>
                {saveHint && <span className="text-sm text-ink-subtle">{saveHint}</span>}
                {onRemove && (
                    <Button variant="danger" className="ml-auto" onClick={onRemove}>
                        {translate("dappForm.remove")}
                    </Button>
                )}
            </div>
        </form>
    );
}
