import { useId, useState } from "react";
import { Button } from "@frontend/design-system-react/button";
import { Callout } from "@frontend/design-system-react/callout";
import { Card } from "@frontend/design-system-react/card";
import { ZapIcon } from "@frontend/design-system-react/icons";
import { cn } from "@frontend/design-system-react/utils";
import { useGetSettings, useSetAutoApproval } from "@frontend/console-admin/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { RefreshError } from "../../../common/components/feedback/load-error/load-error";
import { ConfirmDialog } from "../../../common/containers/confirm-dialog/confirm-dialog";
import { useErrorMessage } from "../../../common/hooks/use-error-message";

export function AutoApprovalSwitch(): React.JSX.Element {
    const translate = useTranslate();
    const settings = useGetSettings();
    const save = useSetAutoApproval();
    const [confirming, setConfirming] = useState(false);
    const loadErrorMessage = useErrorMessage(settings.error);
    const saveErrorMessage = useErrorMessage(save.error);
    const enabled = settings.data?.autoApproval.enabled;
    const dailyCap = settings.data?.autoApproval.dailyCap;
    const id = useId();

    const setEnabled = (next: boolean): void => save.mutate(next, { onSuccess: () => setConfirming(false) });
    const saveFailure = save.isError && (
        <Callout tone="error" title={translate("admin.autoApproval.notChanged")}>
            <p>{saveErrorMessage}</p>
        </Callout>
    );

    return (
        <Card as="div" className="grid max-w-[480px] flex-[0_1_auto] gap-2.5 px-4 py-3">
            <div className="flex items-center gap-3.5">
                <div className="flex flex-col gap-0.5">
                    <label htmlFor={`${id}-switch`} className="text-base font-semibold">
                        {translate("admin.autoApproval.label")}
                    </label>
                    <span id={`${id}-hint`} className="text-xs text-ink-subtle">
                        {dailyCap === undefined
                            ? translate("admin.autoApproval.hint")
                            : translate("admin.autoApproval.hintWithCap", { cap: dailyCap })}
                    </span>
                </div>
                {enabled !== undefined && (
                    <>
                        <span className="relative h-6 w-11 flex-none">
                            <input
                                id={`${id}-switch`}
                                type="checkbox"
                                className="peer absolute inset-0 z-1 m-0 h-full w-full cursor-pointer opacity-0 aria-disabled:cursor-not-allowed"
                                role="switch"
                                aria-describedby={`${id}-hint`}
                                checked={enabled}
                                aria-disabled={save.isPending || undefined}
                                onChange={(event) => {
                                    if (save.isPending) return;
                                    save.reset();
                                    if (event.target.checked) setConfirming(true);
                                    else setEnabled(false);
                                }}
                            />
                            <span
                                className="absolute inset-0 rounded-pill bg-border-strong transition-[background] duration-120 peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-focus peer-focus-visible:outline-offset-2 peer-aria-disabled:opacity-60 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-pill after:bg-knob after:shadow-[0_1px_2px_rgba(0,0,0,0.3)] after:transition-[left] after:duration-120 after:content-[''] peer-checked:after:left-[22px]"
                                aria-hidden="true"
                            />
                        </span>
                        <span className={cn("min-w-6 text-sm font-semibold", enabled ? "text-link" : "text-ink-subtle")} aria-hidden="true">
                            {translate(enabled ? "admin.autoApproval.on" : "admin.autoApproval.off")}
                        </span>
                    </>
                )}
            </div>
            {settings.error &&
                (settings.data === undefined ? (
                    <Callout tone="error" title={translate("admin.autoApproval.loadError")}>
                        <p>{loadErrorMessage}</p>
                        <Button
                            variant="secondary"
                            size="small"
                            className="self-start"
                            loading={settings.isFetching}
                            onClick={() => void settings.refetch()}
                        >
                            {translate("tryAgain")}
                        </Button>
                    </Callout>
                ) : (
                    <RefreshError error={settings.error} />
                ))}
            {!confirming && saveFailure}
            <ConfirmDialog
                open={confirming}
                onClose={() => setConfirming(false)}
                title={translate("admin.autoApproval.confirmTitle")}
                description={translate("admin.autoApproval.confirmDescription", { cap: dailyCap })}
                icon={<ZapIcon size={20} />}
                tone="warn"
                confirmLabel={translate("admin.autoApproval.confirm")}
                loading={save.isPending}
                onConfirm={() => setEnabled(true)}
            >
                <ul className="m-0 py-0 pr-0 pl-[18px] text-base leading-[1.6] text-ink-2">
                    <li>{translate("admin.autoApproval.points.alerts")}</li>
                    <li>{translate("admin.autoApproval.points.pending")}</li>
                    <li>{translate("admin.autoApproval.points.changes")}</li>
                    <li>{translate("admin.autoApproval.points.returning")}</li>
                </ul>
                {saveFailure}
            </ConfirmDialog>
        </Card>
    );
}
