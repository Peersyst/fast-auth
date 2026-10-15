import type { OwnerDapp, SyncedFields } from "../../api/client";
import { useNearNetwork } from "../../api/hooks";
import { diffSyncedFields } from "../../lib/dapp-fields";
import { formatDateTime } from "../../lib/format";
import { NEAR_NETWORKS } from "../../lib/near-network";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { CopyButton } from "../../ui/CopyButton";
import { CheckIcon, ClockIcon, KeyIcon, WarningIcon } from "../../ui/icons";
import { ChangeDiff } from "../dapp/ChangeDiff";
import { FieldList } from "../dapp/FieldValues";
import valueStyles from "../dapp/values.module.css";
import styles from "./dapp.module.css";

export function PendingStatus({ submittedAt, email }: { submittedAt: string; email: string }) {
    return (
        <section className={styles.status}>
            <ol className={styles.steps}>
                <li className={styles.step}>
                    <span className={`${styles.stepMark} ${styles.stepDone}`} aria-hidden="true">
                        <CheckIcon />
                    </span>
                    <div className={styles.stepText}>
                        <span className={styles.stepTitle}>Submitted</span>
                        <span className={styles.stepNote}>{formatDateTime(submittedAt)}</span>
                    </div>
                </li>
                <li className={styles.step} aria-current="step">
                    <span className={`${styles.stepMark} ${styles.stepCurrent}`} aria-hidden="true">
                        2
                    </span>
                    <div className={styles.stepText}>
                        <span className={styles.stepTitle}>Review</span>
                        <span className={styles.stepNote}>The NEAR Auth team is reviewing your application.</span>
                    </div>
                </li>
                <li className={`${styles.step} ${styles.stepLater}`}>
                    <span className={`${styles.stepMark} ${styles.stepNext}`} aria-hidden="true">
                        3
                    </span>
                    <div className={styles.stepText}>
                        <span className={styles.stepTitle}>Approval</span>
                        <span className={styles.stepNote}>
                            Your <code className={styles.stepCode}>clientId</code> appears here and is emailed to you.
                        </span>
                    </div>
                </li>
            </ol>
            <p className={styles.statusFoot}>
                We&apos;ll email <strong>{email}</strong> as soon as it&apos;s reviewed. You can keep editing the details below while you
                wait.
            </p>
        </section>
    );
}

export function RejectedStatus({ reason }: { reason: string | null }) {
    return (
        <section className={styles.rejected}>
            <div className={styles.rejectedHeader}>
                <span className={styles.rejectedIcon}>
                    <WarningIcon />
                </span>
                <div className={styles.rejectedTitle}>
                    <p className={styles.rejectedHeading}>Your application was not approved</p>
                    <p className={styles.rejectedNote}>The reason was also emailed to the dApp&apos;s owner when it was rejected.</p>
                </div>
            </div>
            <blockquote className={styles.reason}>{reason}</blockquote>
            <p>Update the details below and resubmit. Your dApp goes straight back into the review queue.</p>
        </section>
    );
}

type ChangeUnderReviewProps = {
    live: OwnerDapp;
    change: SyncedFields;
    onWithdraw: () => void;
};

export function ChangeUnderReview({ live, change, onWithdraw }: ChangeUnderReviewProps) {
    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                    <ClockIcon />
                </span>
                <h2>Change under review</h2>
                {live.pendingChangeAt && <span className={styles.cardNote}>Requested {formatDateTime(live.pendingChangeAt)}</span>}
            </div>
            <div className={styles.cardBody}>
                <p>
                    Your live settings stay as they are until the NEAR Auth team approves it. To withdraw it, edit the fields back to their
                    live values or use Withdraw change.
                </p>
                <ChangeDiff rows={diffSyncedFields(live, change)} beforeLabel="Live" afterLabel="Proposed" />
                <div>
                    <Button variant="secondary" onClick={onWithdraw}>
                        Withdraw change
                    </Button>
                </div>
            </div>
        </section>
    );
}

export function Credentials({ clientId }: { clientId: string }) {
    const network = useNearNetwork();
    const settings = NEAR_NETWORKS[network];
    return (
        <>
            <section className={styles.card}>
                <div className={styles.cardHeader}>
                    <span className={styles.cardIcon}>
                        <KeyIcon />
                    </span>
                    <h2>{settings.name} credentials</h2>
                    <span className={styles.cardNote}>
                        Your client ID is public because it ships in your app&apos;s code. Only your registered callback URLs and web
                        origins can use it.
                    </span>
                </div>
                <FieldList
                    rows={[
                        [
                            "Client ID",
                            <span key="clientId" className={styles.clientId}>
                                <code className={valueStyles.code}>{clientId}</code>
                                <CopyButton value={clientId} label="Copy client ID" className={styles.copy} />
                            </span>,
                        ],
                        [
                            "Network",
                            <code key="network" className={valueStyles.code}>
                                {network}
                            </code>,
                        ],
                        [
                            "Signing audience",
                            <span key="audience">
                                <code className={valueStyles.code}>{settings.signingAudience}</code>{" "}
                                <span className={styles.aside}>· default for {network}</span>
                            </span>,
                        ],
                        [
                            "Contracts",
                            <span key="contracts">
                                <code className={valueStyles.code}>{settings.fastAuthContract}</code>{" "}
                                <span className={styles.aside}>· MPC</span> <code className={valueStyles.code}>{settings.mpcContract}</code>
                            </span>,
                        ],
                    ]}
                />
            </section>

            <div className={styles.group}>
                <h2>Go live</h2>
                <p className={styles.groupNote}>
                    Point your provider at {network} with your client ID. The rest of your integration stays the same.
                </p>
                <figure className={styles.snippet}>
                    <figcaption>
                        <span className={styles.dots} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </span>
                        main.ts
                    </figcaption>
                    <pre>
                        <code>
                            <span className={styles.kw}>import</span>
                            {" { JavascriptProvider } "}
                            <span className={styles.kw}>from</span>{" "}
                            <span className={styles.str}>{'"@fast-auth-near/javascript-provider"'}</span>
                            {";\n\n"}
                            <span className={styles.kw}>const</span>
                            {" provider "}
                            <span className={styles.kw}>=</span> <span className={styles.kw}>new</span>{" "}
                            <span className={styles.fn}>JavascriptProvider</span>
                            {"({\n  network: "}
                            <span className={styles.str}>{`"${network}"`}</span>
                            {",\n  clientId: "}
                            <span className={styles.str}>{`"${clientId}"`}</span>
                            {",\n});"}
                        </code>
                    </pre>
                </figure>
                <Callout tone="tip">
                    <p>
                        Use the {network} account ids when you construct the client. See{" "}
                        <a href={settings.resourcesUrl}>{settings.name} resources</a>.
                    </p>
                </Callout>
            </div>
        </>
    );
}
