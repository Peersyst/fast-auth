import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useRef, useState, type ReactNode } from "react";
import { useFieldArray, useForm, type DefaultValues, type UseFormReturn } from "react-hook-form";
import { DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH } from "../../../../src/domain/field-rules";
import { ApiError, type DappFormFields, type OwnerDapp } from "../../api/client";
import { errorMessage } from "../../api/error-message";
import { MAU_BRACKETS, MAU_LABELS } from "../../lib/dapp-fields";
import { dappFormSchema, FIELD_REASONS, FORM_LABELS, URL_LISTS, type DappFormInput } from "../../lib/dapp-schema";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { Field } from "../../ui/Field";
import fieldStyles from "../../ui/Field.module.css";
import { CloseIcon, PlusIcon } from "../../ui/icons";
import styles from "./DappForm.module.css";

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
            {reviewed && <span className={styles.review}>Changes wait for review. </span>}
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
        <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
            {mode === "admin" && values?.status === "approved" && (
                <Callout tone="warning" title="This dApp is live">
                    <p>
                        Changes to the name, description, logo or URLs update its Auth0 client at once. The owner is emailed about any
                        change.
                    </p>
                </Callout>
            )}

            <fieldset className={styles.section}>
                <legend>
                    <h2>Application</h2>
                </legend>
                <p className={styles.sectionHint}>Shown to your users on the NEAR Auth login and transaction-approval screens.</p>
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

            <fieldset className={styles.section}>
                <legend>
                    <h2>Capacity</h2>
                </legend>
                <p className={styles.sectionHint}>Lets us provision capacity and set rate limits for your app.</p>
                <Field label={FORM_LABELS.mauBracket} tag="required" error={errors.mauBracket?.message}>
                    {(control) => (
                        <select {...control} className={`${control.className} ${styles.mau}`} {...register("mauBracket")}>
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

            <fieldset className={styles.section}>
                <legend>
                    <h2>Whitelisted URLs</h2>
                </legend>
                <p className={styles.sectionHint}>Register production and staging together. Add one entry per environment.</p>
                <Callout tone="warning">
                    <p>
                        <strong>HTTPS is required</strong> for every URL. Plain <code className={styles.plainCode}>http://</code> URLs are
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
                            <code className={styles.code}>redirectUri</code> you configure in the SDK.
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
                            Only needed if you pass a return URL when calling <code className={styles.code}>logout</code>.
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

            <fieldset className={styles.section}>
                <legend>
                    <h2>Contact</h2>
                </legend>
                <p className={styles.sectionHint}>How the NEAR Auth team can reach your team about your app.</p>
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
                            className={`${control.className} ${styles.contact}`}
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
            <div className={styles.actions}>
                <Button type="submit" loading={formState.isSubmitting}>
                    {saveLabel}
                </Button>
                <Button variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                {saveHint && <span className={styles.saveHint}>{saveHint}</span>}
                {onRemove && (
                    <Button variant="danger" className={styles.remove} onClick={onRemove}>
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
        <fieldset className={styles.list} aria-describedby={listError ? `${hintId} ${listErrorId}` : hintId}>
            <legend className={fieldStyles.label}>{FORM_LABELS[name]}</legend>
            <span className={fieldStyles[tag]}>{tag}</span>
            <p id={hintId} className={fieldStyles.hint}>
                {hint}
            </p>
            <div className={styles.rows}>
                {fields.map((row, index) => {
                    const error = errors?.[index]?.value?.message;
                    const errorId = `${id}-${index}-error`;
                    return (
                        <div key={row.id} className={styles.row}>
                            <input
                                {...form.register(`${name}.${index}.value`, {
                                    onChange: () => listError && form.clearErrors(name),
                                })}
                                className={fieldStyles.control}
                                type="url"
                                placeholder={placeholder}
                                aria-label={`${itemLabel} ${index + 1}`}
                                aria-invalid={error || listError ? true : undefined}
                                aria-describedby={error ? errorId : undefined}
                            />
                            <button
                                type="button"
                                className={styles.removeRow}
                                disabled={fields.length <= min}
                                aria-label={`Remove ${noun} ${index + 1}`}
                                onClick={() => removeRow(index)}
                            >
                                <CloseIcon />
                            </button>
                            {error && (
                                <p id={errorId} className={`${fieldStyles.error} ${styles.rowError}`} role="alert">
                                    {error}
                                </p>
                            )}
                        </div>
                    );
                })}
                {listError && (
                    <p id={listErrorId} className={fieldStyles.error} role="alert">
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
