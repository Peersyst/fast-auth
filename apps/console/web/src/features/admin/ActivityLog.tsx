import type { ReactElement, ReactNode } from "react";
import { FIELD_LABELS, MAU_LABELS, SYNCED_FIELDS } from "@shared/console-domain/dapp";
import type { FieldValue } from "@shared/console-domain/dapp-event";
import type { FieldValueChange } from "@shared/console-domain/dapp-edits";
import type { DappEvent, DappEventType, EmailTemplate, FieldChange, SyncedFields } from "../../api/client";
import { errorMessage } from "../../api/error-message";
import { useDappEvents } from "../../api/hooks";
import { RefreshError } from "../../app/LoadError";
import { formatDateTime } from "../../lib/format";
import { Callout } from "../../ui/Callout";
import { ServerIcon } from "../../ui/icons";
import { Spinner } from "../../ui/Spinner";
import { ChangeDiff } from "../dapp/ChangeDiff";
import { FieldList, Value, valueClasses, type FieldRow } from "../dapp/FieldValues";
import { adminClasses } from "./classes";
import { EmailText, isErased } from "./Email";

const TONES = {
    ok: "bg-ok-bg text-ok-ink",
    warn: "bg-warning-bg text-warning-ink",
    danger: "bg-danger-bg text-danger-ink",
    neutral: "bg-surface-muted text-ink-2",
};

const EVENTS: Record<DappEventType, { label: string; tone: string }> = {
    submitted: { label: "Submitted for review", tone: TONES.ok },
    edited: { label: "Edited", tone: TONES.neutral },
    resubmitted: { label: "Resubmitted for review", tone: TONES.warn },
    approved: { label: "Approved", tone: TONES.ok },
    auto_approved: { label: "Auto-approved", tone: TONES.ok },
    rejected: { label: "Rejected", tone: TONES.danger },
    change_requested: { label: "Change requested", tone: TONES.warn },
    change_withdrawn: { label: "Change withdrawn", tone: TONES.neutral },
    change_approved: { label: "Change approved", tone: TONES.ok },
    change_rejected: { label: "Change rejected", tone: TONES.danger },
    owner_changed: { label: "Owner changed", tone: TONES.neutral },
    removed: { label: "Removed", tone: TONES.danger },
    auth0_created: { label: "Auth0 client created", tone: TONES.ok },
    auth0_updated: { label: "Auth0 client updated", tone: TONES.ok },
    auth0_deleted: { label: "Auth0 client deleted", tone: TONES.neutral },
    auth0_failed: { label: "Auth0 call failed", tone: TONES.danger },
    email_sent: { label: "Email sent", tone: TONES.neutral },
    email_failed: { label: "Email failed", tone: TONES.danger },
};

const EMAIL_LABELS: Record<EmailTemplate, string> = {
    dapp_approved: "approval, to the owner",
    dapp_rejected: "rejection, to the owner",
    change_approved: "change approved, to the owner",
    change_rejected: "change rejected, to the owner",
    changed_by_admin: "changed by an admin, to the owner",
    removed_by_admin: "removed by an admin, to the owner",
    admin_alert: "alert, to the admins",
};

function changeRows(changes: FieldChange[]): FieldValueChange[] {
    const mauLabels: Partial<Record<string, string>> = MAU_LABELS;
    return changes.flatMap((change): FieldValueChange[] => {
        if (change.field === "contactEmail") return [];
        const { field } = change;
        const shown = (value: FieldValue) => (field === "mauBracket" && typeof value === "string" ? (mauLabels[value] ?? value) : value);
        return [{ field, before: shown(change.before), after: shown(change.after) }];
    });
}

function payloadRows(payload: SyncedFields): FieldRow[] {
    return SYNCED_FIELDS.map(
        (field): FieldRow => [
            FIELD_LABELS[field],
            <Value key={field} value={payload[field]} code={field !== "name" && field !== "description"} />,
        ],
    );
}

function CodeLine({ label, value }: { label: string; value: string }) {
    return (
        <p>
            {label}: <code className={valueClasses.code}>{value}</code>
        </p>
    );
}

function eventDetails(event: DappEvent): ReactElement | null {
    switch (event.type) {
        case "submitted":
            return <p>{event.details.chosenForAutoApproval ? "Chosen for auto-approval." : "Queued for manual review."}</p>;
        case "edited":
        case "change_requested":
        case "change_approved": {
            const { changes } = event.details;
            const rows = changeRows(changes);
            return (
                <>
                    {rows.length > 0 && <ChangeDiff rows={rows} beforeLabel="Before" afterLabel="After" />}
                    {changes.some((change) => change.field === "contactEmail") && <p>The contact email changed.</p>}
                </>
            );
        }
        case "rejected":
        case "change_rejected":
        case "removed":
            return event.details.reason === undefined ? null : (
                <blockquote className="mx-0 mt-1 mb-0 rounded-[0_8px_8px_0] border-l-[3px] border-l-danger-border bg-canvas px-[14px] py-2.5 text-sm leading-[1.5] whitespace-pre-wrap text-ink-2 wrap-anywhere">
                    {event.details.reason}
                </blockquote>
            );
        case "email_sent":
            return <p>Email: {EMAIL_LABELS[event.details.template]}.</p>;
        case "email_failed":
            return (
                <>
                    <p>Email: {EMAIL_LABELS[event.details.template]}.</p>
                    <CodeLine label="Error" value={event.details.error} />
                </>
            );
        case "auth0_failed":
            return (
                <>
                    <p>Auth0 operation: {event.details.op}.</p>
                    <CodeLine label="Error" value={event.details.error} />
                    {event.details.clientId !== undefined && <CodeLine label="Client ID" value={event.details.clientId} />}
                </>
            );
        case "auth0_deleted":
            return <CodeLine label="Client ID" value={event.details.clientId} />;
        case "auth0_created":
        case "auth0_updated":
            return (
                <>
                    <CodeLine label="Client ID" value={event.details.clientId} />
                    <details>
                        <summary>Values sent to Auth0</summary>
                        <FieldList rows={payloadRows(event.details.payload)} />
                    </details>
                </>
            );
        case "resubmitted":
        case "approved":
        case "auto_approved":
        case "change_withdrawn":
        case "owner_changed":
            return null;
    }
}

function byLine({ actorEmail, actorRole }: DappEvent): ReactNode {
    if (actorRole === "system") return "by the system";
    const role = actorRole === "admin" ? "admin" : "owner";
    return (
        <>
            by {actorEmail === null ? "unknown" : <EmailText email={actorEmail} />} ({role})
        </>
    );
}

export function ActivityLog({ id }: { id: string }) {
    const events = useDappEvents(id);

    return (
        <section className={adminClasses.card} aria-labelledby="activity-heading">
            <div className={adminClasses.cardHead}>
                <h2 id="activity-heading">Activity</h2>
                {events.data && (
                    <span className={adminClasses.cardMeta}>
                        {events.data.length} {events.data.length === 1 ? "event" : "events"} · newest first
                    </span>
                )}
            </div>
            {events.isError && events.data !== undefined && (
                <div className={adminClasses.cardBody}>
                    <RefreshError error={events.error} />
                </div>
            )}
            {events.isPending ? (
                <div className={adminClasses.cardBody} role="status">
                    <Spinner />
                    <span className="sr-only">Loading the activity…</span>
                </div>
            ) : events.data === undefined ? (
                <div className={adminClasses.cardBody}>
                    <Callout tone="error" title="The activity could not be loaded">
                        <p>{errorMessage(events.error)}</p>
                    </Callout>
                </div>
            ) : events.data.length === 0 ? (
                <p className={`${adminClasses.cardBody} text-ink-subtle`}>No activity yet.</p>
            ) : (
                <ol className="m-0 flex list-none flex-col px-6 pt-1 pb-2">
                    {events.data.map((event) => (
                        <li key={event.id} className="flex gap-3.5 border-b border-b-border py-[14px] last:border-b-0">
                            <span
                                className={`flex size-8 flex-none items-center justify-center rounded-pill text-xs font-bold ${EVENTS[event.type].tone}`}
                                aria-hidden="true"
                            >
                                {event.actorRole === "system" ? (
                                    <ServerIcon size={14} />
                                ) : event.actorEmail === null || isErased(event.actorEmail) ? (
                                    "?"
                                ) : (
                                    event.actorEmail.slice(0, 2).toUpperCase()
                                )}
                            </span>
                            <div className="flex min-w-0 flex-auto flex-col gap-1">
                                <p className="flex flex-wrap items-baseline gap-2 [&_span]:flex-auto [&_span]:text-sm [&_span]:text-ink-subtle [&_span]:wrap-anywhere">
                                    <strong className="text-[14px] font-semibold">{EVENTS[event.type].label}</strong>
                                    <span>{byLine(event)}</span>
                                    <time dateTime={event.createdAt} className="text-xs whitespace-nowrap text-ink-subtle">
                                        {formatDateTime(event.createdAt)}
                                    </time>
                                </p>
                                <div className="grid gap-2 text-sm text-ink-3 empty:hidden [&_dl]:rounded-lg [&_dl]:border [&_dl]:border-border [&_dl]:shadow-card [&_summary]:cursor-pointer [&_summary]:text-ink-subtle">
                                    {eventDetails(event)}
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
