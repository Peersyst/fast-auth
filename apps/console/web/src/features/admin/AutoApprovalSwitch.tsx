import { useId, useState } from "react";
import { AUTO_APPROVAL_DAILY_CAP } from "../../../../src/domain/dapp";
import { errorMessage } from "../../api/error-message";
import { useSettings, useUpdateSettings } from "../../api/hooks";
import { RefreshError } from "../../app/LoadError";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { ConfirmDialog } from "../../ui/Dialog";
import { ZapIcon } from "../../ui/icons";
import styles from "./admin.module.css";

const DAILY_CAP = `${AUTO_APPROVAL_DAILY_CAP} every 24 hours`;

export function AutoApprovalSwitch() {
    const settings = useSettings();
    const save = useUpdateSettings();
    const [confirming, setConfirming] = useState(false);
    const enabled = settings.data?.autoApproval.enabled;
    const id = useId();

    const setEnabled = (next: boolean) => save.mutate({ autoApproval: { enabled: next } }, { onSuccess: () => setConfirming(false) });

    return (
        <div className={styles.switchCard}>
            <div className={styles.switchRow}>
                <div className={styles.switchText}>
                    <label htmlFor={`${id}-switch`} className={styles.switchTitle}>
                        Auto-approve new submissions
                    </label>
                    <span id={`${id}-hint`} className={styles.switchHint}>
                        When on, a new dApp from a first-time owner is approved at once, up to {DAILY_CAP}. dApps already pending are not
                        affected.
                    </span>
                </div>
                {enabled !== undefined && (
                    <>
                        <span className={styles.toggle}>
                            <input
                                id={`${id}-switch`}
                                type="checkbox"
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
                            <span className={styles.toggleTrack} aria-hidden="true" />
                        </span>
                        <span className={enabled ? `${styles.switchState} ${styles.switchOn}` : styles.switchState} aria-hidden="true">
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
                            className={styles.retry}
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
                description={`New submissions are approved and provisioned the moment they arrive, up to ${DAILY_CAP}: an Auth0 application is created and the client ID emailed to the owner with nobody reviewing it.`}
                icon={<ZapIcon size={20} />}
                tone="warn"
                confirmLabel="Turn on auto-approval"
                loading={save.isPending}
                onConfirm={() => setEnabled(true)}
            >
                <ul className={styles.bullets}>
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
