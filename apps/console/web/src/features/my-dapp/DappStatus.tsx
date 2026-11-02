import { diffSyncedFields } from "@shared/console-domain/dapp-edits";
import type { OwnerDapp, SyncedFields } from "../../api/client";
import { useNearNetwork } from "../../api/hooks";
import { formatDateTime } from "../../lib/format";
import { NEAR_NETWORKS } from "../../lib/near-network";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { CopyButton } from "../../ui/CopyButton";
import { CheckIcon, ClockIcon, KeyIcon, WarningIcon } from "../../ui/icons";
import { ChangeDiff } from "./ChangeDiff";
import { myDappClasses } from "./classes";
import { FieldList, valueClasses } from "./FieldValues";

const STEP = "flex flex-[1_1_200px] gap-3";
const STEP_MARK = "flex size-7 flex-none items-center justify-center rounded-pill text-sm font-bold";
const STEP_TEXT = "flex flex-col gap-0.5";
const STEP_TITLE = "text-[14px] font-semibold";
const CARD = `flex flex-col overflow-hidden ${myDappClasses.card}`;
const CARD_HEADER =
    "flex flex-wrap items-center gap-3 border-b border-b-border bg-canvas px-6 py-4 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:tracking-[normal]";
const CARD_ICON = "flex text-link";
const NOTE = "text-sm text-ink-subtle";

export function PendingStatus({ submittedAt, email }: { submittedAt: string; email: string }) {
    return (
        <section className={`flex flex-col gap-5 p-6 ${myDappClasses.card}`}>
            <ol className="m-0 flex list-none flex-wrap gap-6 p-0">
                <li className={STEP}>
                    <span className={`${STEP_MARK} bg-accent text-on-accent`} aria-hidden="true">
                        <CheckIcon />
                    </span>
                    <div className={STEP_TEXT}>
                        <span className={STEP_TITLE}>Submitted</span>
                        <span className={NOTE}>{formatDateTime(submittedAt)}</span>
                    </div>
                </li>
                <li className={STEP} aria-current="step">
                    <span className={`${STEP_MARK} border-2 border-link text-link`} aria-hidden="true">
                        2
                    </span>
                    <div className={STEP_TEXT}>
                        <span className={STEP_TITLE}>Review</span>
                        <span className={NOTE}>The NEAR Auth team is reviewing your application.</span>
                    </div>
                </li>
                <li className={STEP}>
                    <span className={`${STEP_MARK} border-2 border-border text-faint`} aria-hidden="true">
                        3
                    </span>
                    <div className={STEP_TEXT}>
                        <span className={`${STEP_TITLE} text-ink-subtle`}>Approval</span>
                        <span className="text-sm text-faint">
                            Your <code className="font-mono text-xs">clientId</code> appears here and is emailed to you.
                        </span>
                    </div>
                </li>
            </ol>
            <p className="border-t border-t-border pt-4 text-[14px] text-ink-subtle wrap-anywhere [&_strong]:font-semibold [&_strong]:text-ink">
                We&apos;ll email <strong>{email}</strong> as soon as it&apos;s reviewed. You can keep editing the details below while you
                wait.
            </p>
        </section>
    );
}

export function RejectedStatus({ reason }: { reason: string | null }) {
    return (
        <section className="flex flex-col gap-4 rounded-lg border border-danger-border bg-danger-bg px-6 py-5 text-[14px] text-danger-ink-strong">
            <div className="flex gap-3">
                <span className="mt-0.5 flex flex-none text-danger-ink">
                    <WarningIcon />
                </span>
                <div className="flex min-w-0 flex-col gap-1.5 text-danger-ink wrap-anywhere">
                    <p className="text-md font-semibold">Your application was not approved</p>
                    <p className="text-sm">The reason was also emailed to the dApp&apos;s owner when it was rejected.</p>
                </div>
            </div>
            <blockquote className="m-0 rounded-[0_10px_10px_0] border-l-[3px] border-l-danger-border bg-surface px-4 py-[14px] leading-[1.6] whitespace-pre-wrap text-ink wrap-anywhere">
                {reason}
            </blockquote>
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
        <section className={CARD}>
            <div className={CARD_HEADER}>
                <span className={CARD_ICON}>
                    <ClockIcon />
                </span>
                <h2>Change under review</h2>
                {live.pendingChangeAt && <span className={NOTE}>Requested {formatDateTime(live.pendingChangeAt)}</span>}
            </div>
            <div className="flex flex-col gap-4 px-6 py-5 text-[14px]">
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
            <section className={CARD}>
                <div className={CARD_HEADER}>
                    <span className={CARD_ICON}>
                        <KeyIcon />
                    </span>
                    <h2>{settings.name} credentials</h2>
                    <span className={NOTE}>
                        Your client ID is public because it ships in your app&apos;s code. Only your registered callback URLs and web
                        origins can use it.
                    </span>
                </div>
                <FieldList
                    rows={[
                        [
                            "Client ID",
                            <span key="clientId" className="mx-0 -my-1 flex min-w-0 items-center gap-2.5">
                                <code className={`${valueClasses.code} min-w-0 flex-auto`}>{clientId}</code>
                                <CopyButton value={clientId} label="Copy client ID" className="flex-none" />
                            </span>,
                        ],
                        [
                            "Network",
                            <code key="network" className={valueClasses.code}>
                                {network}
                            </code>,
                        ],
                        [
                            "Signing audience",
                            <span key="audience">
                                <code className={valueClasses.code}>{settings.signingAudience}</code>{" "}
                                <span className={NOTE}>· default for {network}</span>
                            </span>,
                        ],
                        [
                            "Contracts",
                            <span key="contracts">
                                <code className={valueClasses.code}>{settings.fastAuthContract}</code> <span className={NOTE}>· MPC</span>{" "}
                                <code className={valueClasses.code}>{settings.mpcContract}</code>
                            </span>,
                        ],
                    ]}
                />
            </section>

            <div className="flex flex-col gap-3 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:tracking-[-0.015em]">
                <h2>Go live</h2>
                <p className="text-[14px] text-ink-subtle">
                    Point your provider at {network} with your client ID. The rest of your integration stays the same.
                </p>
                <figure className="m-0 overflow-hidden rounded-lg border border-[rgba(255,255,255,0.1)] bg-code-bg shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
                    <figcaption className="flex items-center gap-3 border-b border-b-[rgba(255,255,255,0.1)] bg-code-bar px-4 py-3 font-mono text-xs text-code-muted">
                        <span
                            className="flex gap-1.5 [&>span]:size-2.5 [&>span]:rounded-pill [&>span]:bg-[rgba(255,255,255,0.18)]"
                            aria-hidden="true"
                        >
                            <span />
                            <span />
                            <span />
                        </span>
                        main.ts
                    </figcaption>
                    <pre className="m-0 overflow-x-auto p-6 font-mono text-sm leading-[1.6] text-code-ink">
                        <code>
                            <span className="text-code-kw">import</span>
                            {" { JavascriptProvider } "}
                            <span className="text-code-kw">from</span>{" "}
                            <span className="text-code-str">{'"@fast-auth-near/javascript-provider"'}</span>
                            {";\n\n"}
                            <span className="text-code-kw">const</span>
                            {" provider "}
                            <span className="text-code-kw">=</span> <span className="text-code-kw">new</span>{" "}
                            <span className="text-code-fn">JavascriptProvider</span>
                            {"({\n  network: "}
                            <span className="text-code-str">{`"${network}"`}</span>
                            {",\n  clientId: "}
                            <span className="text-code-str">{`"${clientId}"`}</span>
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
