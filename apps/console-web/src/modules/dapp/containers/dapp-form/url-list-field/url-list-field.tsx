import { ReactNode, useId, useRef } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { Button } from "@frontend/design-system-react/button";
import { fieldClasses } from "@frontend/design-system-react/field";
import { CloseIcon, PlusIcon } from "@frontend/design-system-react/icons";
import { cn } from "@frontend/design-system-react/utils";
import { useTranslate } from "@frontend/locale/react";
import { LocaleErrorResource } from "@frontend/locale";
import { UpsertDappRequest } from "@shared/console";
import { URL_LIST_RULES, UrlListField as UrlListFieldName } from "@shared/modules/dapp";
import { DAPP_FORM_ERROR_VALUES, DappFormInput } from "../dapp-form.types";

export type UrlListFieldProps = {
    form: UseFormReturn<DappFormInput, unknown, UpsertDappRequest>;
    name: UrlListFieldName;
    hint: ReactNode;
};

export function UrlListField({ form, name, hint }: UrlListFieldProps): React.JSX.Element {
    const translate = useTranslate();
    const translateError = useTranslate("error");
    const { fields, append, remove } = useFieldArray({ control: form.control, name });
    const { min, max } = URL_LIST_RULES[name];
    const errors = form.formState.errors[name];
    const listErrorKey = errors?.root?.message ?? errors?.message;
    const listError = listErrorKey && translateError(listErrorKey as LocaleErrorResource, DAPP_FORM_ERROR_VALUES[name]);
    const id = useId();
    const hintId = `${id}-hint`;
    const listErrorId = `${id}-error`;
    const tag = min > 0 ? "required" : "optional";
    const addButton = useRef<HTMLButtonElement>(null);

    const removeRow = (index: number): void => {
        remove(index);
        const neighbour = Math.min(index, fields.length - 2);
        if (neighbour >= 0) form.setFocus(`${name}.${neighbour}.value`);
        else addButton.current?.focus();
    };

    return (
        <fieldset
            className="m-0 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2 border-0 p-0"
            aria-describedby={listError ? `${hintId} ${listErrorId}` : hintId}
        >
            <legend className={cn(fieldClasses.label, "float-left p-0")}>{translate(`dappForm.${name}.label`)}</legend>
            <span className={fieldClasses[tag]}>{translate(`dappForm.${tag}`)}</span>
            <p id={hintId} className={cn(fieldClasses.hint, "col-span-full")}>
                {hint}
            </p>
            <div className="col-span-full flex flex-col gap-2">
                {fields.map((row, index) => {
                    const errorKey = errors?.[index]?.value?.message;
                    const error = errorKey && translateError(errorKey as LocaleErrorResource);
                    const errorId = `${id}-${index}-error`;
                    return (
                        <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                            <input
                                {...form.register(`${name}.${index}.value`, {
                                    onChange: () => listError && form.clearErrors(name),
                                })}
                                className={fieldClasses.control}
                                type="url"
                                placeholder={translate(`dappForm.${name}.placeholder`)}
                                aria-label={translate(`dappForm.${name}.item`, { number: index + 1 })}
                                aria-invalid={error || listError ? true : undefined}
                                aria-describedby={error ? errorId : undefined}
                            />
                            <button
                                type="button"
                                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-pill border border-border bg-surface p-0 text-ink-subtle not-disabled:hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={fields.length <= min}
                                aria-label={translate(`dappForm.${name}.remove`, { number: index + 1 })}
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
                        {translate(`dappForm.${name}.add`)}
                    </Button>
                </div>
            </div>
        </fieldset>
    );
}
