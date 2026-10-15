import type { ReactElement, ReactNode } from "react";
import type { DappEvent, DappEventType, EmailTemplate, FieldChange, SyncedFields } from "../../api/client";
import { errorMessage } from "../../api/error-message";
import { useDappEvents } from "../../api/hooks";
import { RefreshError } from "../../app/LoadError";
import { FIELD_LABELS, MAU_LABELS, SYNCED_FIELDS, type FieldValue, type FieldValueChange } from "../../lib/dapp-fields";
import { formatDateTime } from "../../lib/format";
import { Callout } from "../../ui/Callout";
import { ServerIcon } from "../../ui/icons";
import { Spinner } from "../../ui/Spinner";
import { ChangeDiff } from "../dapp/ChangeDiff";
import { FieldList, Value, type FieldRow } from "../dapp/FieldValues";
import valueStyles from "../dapp/values.module.css";
import styles from "./admin.module.css";
import { EmailText, isErased } from "./Email";

const EVENTS: Record<DappEventType, { label: string; tone: string | undefined }> = {
    submitted: { label: "Submitted for review", tone: styles.toneOk },
    edited: { label: "Edited", tone: styles.toneNeutral },
    resubmitted: { label: "Resubmitted for review", tone: styles.toneWarn },
    approved: { label: "Approved", tone: styles.toneOk },
    auto_approved: { label: "Auto-approved", tone: styles.toneOk },
    rejected: { label: "Rejected", tone: styles.toneDanger },
    change_requested: { label: "Change requested", tone: styles.toneWarn },
    change_withdrawn: { label: "Change withdrawn", tone: styles.toneNeutral },
    change_approved: { label: "Change approved", tone: styles.toneOk },
    change_rejected: { label: "Change rejected", tone: styles.toneDanger },
    owner_changed: { label: "Owner changed", tone: styles.toneNeutral },
    removed: { label: "Removed", tone: styles.toneDanger },
    auth0_created: { label: "Auth0 client created", tone: styles.toneOk },
    auth0_updated: { label: "Auth0 client updated", tone: styles.toneOk },
    auth0_deleted: { label: "Auth0 client deleted", tone: styles.toneNeutral },
    auth0_failed: { label: "Auth0 call failed", tone: styles.toneDanger },
    email_sent: { label: "Email sent", tone: styles.toneNeutral },
    email_failed: { label: "Email failed", tone: styles.toneDanger },
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
            {label}: <code className={valueStyles.code}>{value}</code>
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
            return event.details.reason === undefined ? null : <blockquote className={styles.quote}>{event.details.reason}</blockquote>;
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
        <section className={styles.card} aria-labelledby="activity-heading">
            <div className={styles.cardHead}>
                <h2 id="activity-heading">Activity</h2>
                {events.data && (
                    <span className={styles.cardMeta}>
                        {events.data.length} {events.data.length === 1 ? "event" : "events"} · newest first
                    </span>
                )}
            </div>
            {events.isError && events.data !== undefined && (
                <div className={styles.cardBody}>
                    <RefreshError error={events.error} />
                </div>
            )}
            {events.isPending ? (
                <div className={styles.cardBody} role="status">
                    <Spinner />
                    <span className={styles.srOnly}>Loading the activity…</span>
                </div>
            ) : events.data === undefined ? (
                <div className={styles.cardBody}>
                    <Callout tone="error" title="The activity could not be loaded">
                        <p>{errorMessage(events.error)}</p>
                    </Callout>
                </div>
            ) : events.data.length === 0 ? (
                <p className={`${styles.cardBody} ${styles.muted}`}>No activity yet.</p>
            ) : (
                <ol className={styles.log}>
                    {events.data.map((event) => (
                        <li key={event.id} className={styles.event}>
                            <span className={`${styles.eventMark} ${EVENTS[event.type].tone}`} aria-hidden="true">
                                {event.actorRole === "system" ? (
                                    <ServerIcon size={14} />
                                ) : event.actorEmail === null || isErased(event.actorEmail) ? (
                                    "?"
                                ) : (
                                    event.actorEmail.slice(0, 2).toUpperCase()
                                )}
                            </span>
                            <div className={styles.eventMain}>
                                <p className={styles.eventHead}>
                                    <strong>{EVENTS[event.type].label}</strong>
                                    <span>{byLine(event)}</span>
                                    <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
                                </p>
                                <div className={styles.eventDetails}>{eventDetails(event)}</div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
