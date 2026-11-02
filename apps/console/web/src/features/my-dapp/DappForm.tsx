import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useRef, useState, type ReactNode } from "react";
import { useFieldArray, useForm, type DefaultValues, type UseFormReturn } from "react-hook-form";
import { DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH } from "@shared/console-domain/field-rules";
import { MAU_LABELS } from "@shared/console-domain/dapp";
import { ApiError, type DappFormFields, type OwnerDapp } from "../../api/client";
import { errorMessage } from "../../api/error-message";
import { cn } from "../../lib/cn";
import { dappFormSchema, FIELD_REASONS, FORM_LABELS, MAU_BRACKETS, URL_LISTS, type DappFormInput } from "../../lib/dapp-schema";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { Field, fieldClasses } from "../../ui/Field";
import { CloseIcon, PlusIcon } from "../../ui/icons";

const SECTION =
    "m-0 flex min-w-0 flex-col gap-6 border-0 p-0 [&_h2]:text-xl [&_h2]:leading-[1.5] [&_h2]:font-bold [&_h2]:tracking-[-0.015em] [&>legend]:w-full [&>legend]:p-0";
const SECTION_HINT = "mt-1 border-b border-b-border pb-3 text-[14px] text-ink-subtle";
const CODE = "rounded-[4px] bg-surface-muted px-[5px] py-px font-mono text-sm";

type EditedDapp = DappFormFields & Pick<OwnerDapp, "status" | "pendingChange">;

type DappFormProps = {
    mode: "owner" | "admin";
    values: EditedDapp | null;
    saveLabel: string;
    saveHint?: ReactNode;
    onSave: (fields: DappFormFields) => Promise<unknown>;
    onCancel: () => void;
    onReload?: () => void;
    onRemove?: () => void;
};

type ListField = keyof typeof URL_LISTS;

function isListField(field: keyof DappFormFields): field is ListField {
    return Object.hasOwn(URL_LISTS, field);
}

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
    const rows = (list: string[]) => list.map((value) => ({ value }));
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

export function DappForm({ mode, values, saveLabel, saveHint, onSave, onCancel, onReload, onRemove }: DappFormProps) {
    const reviewed = mode === "owner" && values?.status === "approved";
    const form = useForm<DappFormInput, unknown, DappFormFields>({
        resolver: zodResolver(dappFormSchema),
        defaultValues: toFormInput(values, reviewed),
    });
    const { register, formState } = form;
    const { errors } = formState;
    const [saveError, setSaveError] = useState<unknown>(null);
    const synced = (hint?: ReactNode) => (
        <>
            {reviewed && <span className="font-semibold text-warning-ink">Changes wait for review. </span>}
            {hint}
        </>
    );

    const submit = form.handleSubmit(async (fields) => {
        setSaveError(null);
        try {
            await onSave(fields);
        } catch (error) {
            const refused =
                error instanceof ApiError && error.code === "VALIDATION_FAILED"
                    ? dappFormSchema.keyof().options.filter((field) => error.details.some((detail) => detail.field === field))
                    : [];
            for (const field of refused) form.setError(field, { type: "server", message: FIELD_REASONS[field] });
            const [first] = refused;
            if (first) form.setFocus(isListField(first) ? `${first}.0.value` : first);
            else setSaveError(error);
        }
    });

    return (
        <form className="flex min-w-0 flex-col gap-10" noValidate onSubmit={(event) => void submit(event)}>
            {mode === "admin" && values?.status === "approved" && (
                <Callout tone="warning" title="This dApp is live">
                    <p>
                        Changes to the name, description, logo or URLs update its Auth0 client at once. The owner is emailed about any
                        change.
                    </p>
                </Callout>
            )}

            <fieldset className={SECTION}>
                <legend>
                    <h2>Application</h2>
                </legend>
                <p className={SECTION_HINT}>Shown to your users on the NEAR Auth login and transaction-approval screens.</p>
                <Field
                    label={FORM_LABELS.name}
                    tag="required"
                    hint={synced(
                        <>
                            The public-facing name people recognize, such as <em>Acme Wallet</em>. Up to {NAME_MAX_LENGTH} characters (most
                            emoji count as two or more).
                        </>,
                    )}
                    error={errors.name?.message}
                >
                    {(control) => <input {...control} {...register("name")} autoComplete="off" placeholder="Acme Wallet" />}
                </Field>
                <Field
                    label={FORM_LABELS.description}
                    tag="optional"
                    hint={synced(
                        `One or two sentences, written for end users, up to ${DESCRIPTION_MAX_LENGTH} characters (most emoji count as two or more). Appears next to your name during login.`,
                    )}
                    error={errors.description?.message}
                >
                    {(control) => (
                        <textarea
                            {...control}
                            {...register("description")}
                            rows={3}
                            placeholder="A non-custodial wallet for buying and sending NEAR."
                        />
                    )}
                </Field>
                <Field
                    label={FORM_LABELS.logoUrl}
                    tag="required"
                    hint={synced("A square PNG or SVG (recommended 256×256 px) served over HTTPS.")}
                    error={errors.logoUrl?.message}
                >
                    {(control) => <input {...control} {...register("logoUrl")} type="url" placeholder="https://app.example.com/logo.png" />}
                </Field>
            </fieldset>

            <fieldset className={SECTION}>
                <legend>
                    <h2>Capacity</h2>
                </legend>
                <p className={SECTION_HINT}>Lets us provision capacity and set rate limits for your app.</p>
                <Field label={FORM_LABELS.mauBracket} tag="required" error={errors.mauBracket?.message}>
                    {(control) => (
                        <select {...control} className={cn(control.className, "max-w-[320px]")} {...register("mauBracket")}>
                            {!values && <option value="">Choose a bracket</option>}
                            {MAU_BRACKETS.map((bracket) => (
                                <option key={bracket} value={bracket}>
                                    {MAU_LABELS[bracket]}
                                </option>
                            ))}
                        </select>
                    )}
                </Field>
            </fieldset>

            <fieldset className={SECTION}>
                <legend>
                    <h2>Whitelisted URLs</h2>
                </legend>
                <p className={SECTION_HINT}>Register production and staging together. Add one entry per environment.</p>
                <Callout tone="warning">
                    <p>
                        <strong>HTTPS is required</strong> for every URL. Plain <code className="font-mono text-sm">http://</code> URLs are
                        rejected.
                    </p>
                </Callout>
                <UrlListField
                    form={form}
                    name="callbackUrls"
                    itemLabel="Callback URL"
                    placeholder="https://app.example.com/callback"
                    hint={synced(
                        <>
                            Where NEAR Auth may redirect after login and after a signature request. Must match the{" "}
                            <code className={CODE}>redirectUri</code> you configure in the SDK.
                        </>,
                    )}
                />
                <UrlListField
                    form={form}
                    name="logoutUrls"
                    itemLabel="Logout URL"
                    placeholder="https://app.example.com"
                    hint={synced(
                        <>
                            Only needed if you pass a return URL when calling <code className={CODE}>logout</code>.
                        </>,
                    )}
                />
                <UrlListField
                    form={form}
                    name="webOrigins"
                    itemLabel="Web origin"
                    placeholder="https://app.example.com"
                    hint={synced("Scheme + domain, no path. Only these origins can start the auth flow (CORS).")}
                />
            </fieldset>

            <fieldset className={SECTION}>
                <legend>
                    <h2>Contact</h2>
                </legend>
                <p className={SECTION_HINT}>How the NEAR Auth team can reach your team about your app.</p>
                <Field
                    label={FORM_LABELS.contactEmail}
                    tag="required"
                    hint={
                        <>
                            A monitored alias like <em>dev@example.com</em> works best.
                            {mode === "owner" && " The console's own emails, such as your approval, go to the address you signed in with."}
                        </>
                    }
                    error={errors.contactEmail?.message}
                >
                    {(control) => (
                        <input
                            {...control}
                            className={cn(control.className, "max-w-[420px]")}
                            {...register("contactEmail")}
                            type="email"
                            autoComplete="email"
                            placeholder="dev@example.com"
                        />
                    )}
                </Field>
            </fieldset>

            {saveError !== null && (
                <Callout tone="error" title="Not saved">
                    <p>{errorMessage(saveError)}</p>
                    {onReload && saveError instanceof ApiError && (saveError.statusCode === 404 || saveError.statusCode === 409) && (
                        <div>
                            <Button variant="secondary" onClick={onReload}>
                                Reload
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
                    Cancel
                </Button>
                {saveHint && <span className="text-sm text-ink-subtle">{saveHint}</span>}
                {onRemove && (
                    <Button variant="danger" className="ml-auto" onClick={onRemove}>
                        Remove dApp
                    </Button>
                )}
            </div>
        </form>
    );
}

type UrlListFieldProps = {
    form: UseFormReturn<DappFormInput, unknown, DappFormFields>;
    name: ListField;
    itemLabel: string;
    placeholder: string;
    hint: ReactNode;
};

function UrlListField({ form, name, itemLabel, placeholder, hint }: UrlListFieldProps) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name });
    const { min, max, noun } = URL_LISTS[name];
    const errors = form.formState.errors[name];
    const listError = errors?.root?.message ?? errors?.message;
    const id = useId();
    const hintId = `${id}-hint`;
    const listErrorId = `${id}-error`;
    const tag = min > 0 ? "required" : "optional";
    const addButton = useRef<HTMLButtonElement>(null);

    function removeRow(index: number) {
        remove(index);
        const neighbour = Math.min(index, fields.length - 2);
        if (neighbour >= 0) form.setFocus(`${name}.${neighbour}.value`);
        else addButton.current?.focus();
    }

    return (
        <fieldset
            className="m-0 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2 border-0 p-0"
            aria-describedby={listError ? `${hintId} ${listErrorId}` : hintId}
        >
            <legend className={cn(fieldClasses.label, "float-left p-0")}>{FORM_LABELS[name]}</legend>
            <span className={fieldClasses[tag]}>{tag}</span>
            <p id={hintId} className={cn(fieldClasses.hint, "col-span-full")}>
                {hint}
            </p>
            <div className="col-span-full flex flex-col gap-2">
                {fields.map((row, index) => {
                    const error = errors?.[index]?.value?.message;
                    const errorId = `${id}-${index}-error`;
                    return (
                        <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                            <input
                                {...form.register(`${name}.${index}.value`, {
                                    onChange: () => listError && form.clearErrors(name),
                                })}
                                className={fieldClasses.control}
                                type="url"
                                placeholder={placeholder}
                                aria-label={`${itemLabel} ${index + 1}`}
                                aria-invalid={error || listError ? true : undefined}
                                aria-describedby={error ? errorId : undefined}
                            />
                            <button
                                type="button"
                                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-pill border border-border bg-surface p-0 text-ink-subtle not-disabled:hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={fields.length <= min}
                                aria-label={`Remove ${noun} ${index + 1}`}
                                onClick={() => removeRow(index)}
                            >
                                <CloseIcon />
                            </button>
                            {error && (
                                <p id={errorId} className={cn(fieldClasses.error, "col-span-full")} role="alert">
                                    {error}
                                </p>
                            )}
                        </div>
                    );
                })}
                {listError && (
                    <p id={listErrorId} className={fieldClasses.error} role="alert">
                        {listError}
                    </p>
                )}
                <div>
                    <Button
                        ref={addButton}
                        variant="secondary"
                        size="small"
                        disabled={fields.length >= max}
                        onClick={() => append({ value: "" })}
                    >
                        <PlusIcon />
                        Add {noun}
                    </Button>
                </div>
            </div>
        </fieldset>
    );
}
