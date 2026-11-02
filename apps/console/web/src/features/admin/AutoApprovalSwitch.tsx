import { useId, useState } from "react";
import { errorMessage } from "../../api/error-message";
import { useSettings, useUpdateSettings } from "../../api/hooks";
import { RefreshError } from "../../app/LoadError";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { ConfirmDialog } from "../../ui/Dialog";
import { ZapIcon } from "../../ui/icons";

export function AutoApprovalSwitch() {
    const settings = useSettings();
    const save = useUpdateSettings();
    const [confirming, setConfirming] = useState(false);
    const enabled = settings.data?.autoApproval.enabled;
    const dailyCap = settings.data?.autoApproval.dailyCap;
    const id = useId();

    const setEnabled = (next: boolean) => save.mutate({ autoApproval: { enabled: next } }, { onSuccess: () => setConfirming(false) });

    return (
        <div className="grid max-w-[480px] flex-[0_1_auto] gap-2.5 rounded-lg border border-border bg-surface px-4 py-3 shadow-card">
            <div className="flex items-center gap-3.5">
                <div className="flex flex-col gap-0.5">
                    <label htmlFor={`${id}-switch`} className="text-[14px] font-semibold">
                        Auto-approve new submissions
                    </label>
                    <span id={`${id}-hint`} className="text-xs text-ink-subtle">
                        When on, a new dApp from a first-time owner is approved at once
                        {dailyCap !== undefined && `, up to ${dailyCap} every 24 hours`}. dApps already pending are not affected.
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
                            {enabled ? "On" : "Off"}
                        </span>
                    </>
                )}
            </div>
            {settings.isError &&
                (settings.data === undefined ? (
                    <Callout tone="error" title="The setting could not be loaded">
                        <p>{errorMessage(settings.error)}</p>
                        <Button
                            variant="secondary"
                            size="small"
                            className="self-start"
                            loading={settings.isFetching}
                            onClick={() => void settings.refetch()}
                        >
                            Try again
                        </Button>
                    </Callout>
                ) : (
                    <RefreshError error={settings.error} />
                ))}
            {save.isError && !confirming && (
                <Callout tone="error" title="Not changed">
                    <p>{errorMessage(save.error)}</p>
                </Callout>
            )}
            <ConfirmDialog
                open={confirming}
                onClose={() => setConfirming(false)}
                title="Turn on auto-approval?"
                description={`New submissions are approved and provisioned the moment they arrive, up to ${dailyCap} every 24 hours: an Auth0 application is created and the client ID emailed to the owner with nobody reviewing it.`}
                icon={<ZapIcon size={20} />}
                tone="warn"
                confirmLabel="Turn on auto-approval"
                loading={save.isPending}
                onConfirm={() => setEnabled(true)}
            >
                <ul className="m-0 py-0 pr-0 pl-[18px] text-[14px] leading-[1.6] text-ink-2">
                    <li>Each auto-approval emails the admins. Past that cap, new submissions wait for review.</li>
                    <li>The dApps already pending stay in the queue for manual review.</li>
                    <li>Resubmissions and changes to approved dApps still wait for review.</li>
                    <li>A new dApp from an owner whose email has an earlier dApp, whatever its status, always goes to an admin.</li>
                </ul>
                {save.isError && (
                    <Callout tone="error" title="Not changed">
                        <p>{errorMessage(save.error)}</p>
                    </Callout>
                )}
            </ConfirmDialog>
        </div>
    );
}
