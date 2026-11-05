import { ReactNode } from "react";
import { Callout } from "@frontend/design-system-react/callout";
import { Card, CardBody, CardHeader } from "@frontend/design-system-react/card";
import { ServerIcon } from "@frontend/design-system-react/icons";
import { Spinner } from "@frontend/design-system-react/spinner";
import { useGetDappEvents } from "@frontend/console-admin/ui/queries";
import { useTranslate } from "@frontend/locale/react";
import { DappEventDto } from "@shared/console";
import { DappEventDetails, FieldChange, FieldValue, FieldValueChange, MauBracket, SYNCED_FIELDS, SyncedFields } from "@shared/modules/dapp";
import { RefreshError } from "../../../common/components/feedback/load-error/load-error";
import { useErrorMessage } from "../../../common/hooks/use-error-message";
import { formatDateTime } from "../../../common/utils/format";
import { ChangeDiff } from "../../../dapp/components/change-diff/change-diff";
import { FieldList, FieldRow, Value, valueClassNames } from "../../../dapp/components/field-values/field-values";
import { EmailText, isErased } from "../../components/owner-email/owner-email";

const TONES = {
    ok: "bg-ok-bg text-ok-ink",
    warn: "bg-warning-bg text-warning-ink",
    danger: "bg-danger-bg text-danger-ink",
    neutral: "bg-surface-muted text-ink-2",
};

const EVENT_TONES: Record<DappEventDto["type"], string> = {
    submitted: TONES.ok,
    edited: TONES.neutral,
    resubmitted: TONES.warn,
    approved: TONES.ok,
    auto_approved: TONES.ok,
    rejected: TONES.danger,
    change_requested: TONES.warn,
    change_withdrawn: TONES.neutral,
    change_approved: TONES.ok,
    change_rejected: TONES.danger,
    owner_changed: TONES.neutral,
    removed: TONES.danger,
    auth0_created: TONES.ok,
    auth0_updated: TONES.ok,
    auth0_deleted: TONES.neutral,
    auth0_failed: TONES.danger,
    email_sent: TONES.neutral,
    email_failed: TONES.danger,
};

type Translate = ReturnType<typeof useTranslate>;

const MAU_BRACKETS: readonly string[] = Object.values(MauBracket);

/**
 * Whether a recorded value is an expected-MAU bracket.
 * @param value The value.
 * @returns `true` for a bracket.
 */
function isMauBracket(value: string): value is MauBracket {
    return MAU_BRACKETS.includes(value);
}

/**
 * Reads an event's details as the type it records, as the console stores them per event type.
 * @param event The event.
 * @returns The event's type and details.
 */
function detailsOf(event: DappEventDto): DappEventDetails {
    return { type: event.type, details: event.details } as DappEventDetails;
}

/**
 * Turns an event's field changes into diff rows: brackets as their labels, and the contact email, whose values are not kept, left out.
 * @param changes The changes.
 * @param translate The translate function.
 * @returns The rows.
 */
function changeRows(changes: FieldChange[], translate: Translate): FieldValueChange[] {
    return changes.flatMap((change): FieldValueChange[] => {
        if (change.field === "contactEmail") return [];
        const { field } = change;
        const shown = (value: FieldValue): FieldValue =>
            field === "mauBracket" && typeof value === "string" && isMauBracket(value) ? translate(`dapp.mau.${value}`) : value;
        return [{ field, before: shown(change.before), after: shown(change.after) }];
    });
}

/**
 * Lists the values a dApp sent to Auth0.
 * @param payload The synced fields sent.
 * @param translate The translate function.
 * @returns The rows.
 */
function payloadRows(payload: SyncedFields, translate: Translate): FieldRow[] {
    return SYNCED_FIELDS.map(
        (field): FieldRow => [
            translate(`dapp.fields.${field}`),
            <Value key={field} value={payload[field]} code={field !== "name" && field !== "description"} />,
        ],
    );
}

type CodeLineProps = {
    label: string;
    value: string;
};

function CodeLine({ label, value }: CodeLineProps): React.JSX.Element {
    return (
        <p>
            {label} <code className={valueClassNames.code}>{value}</code>
        </p>
    );
}

type EventDetailsProps = {
    event: DappEventDto;
};

function EventDetails({ event }: EventDetailsProps): React.JSX.Element | null {
    const translate = useTranslate();
    const recorded = detailsOf(event);
    switch (recorded.type) {
        case "submitted":
            return (
                <p>
                    {translate(
                        recorded.details.chosenForAutoApproval ? "admin.dapp.activity.chosenForAutoApproval" : "admin.dapp.activity.queued",
                    )}
                </p>
            );
        case "edited":
        case "change_requested":
        case "change_approved": {
            const { changes } = recorded.details;
            const rows = changeRows(changes, translate);
            return (
                <>
                    {rows.length > 0 && (
                        <ChangeDiff rows={rows} beforeLabel={translate("dapp.diff.before")} afterLabel={translate("dapp.diff.after")} />
                    )}
                    {changes.some((change) => change.field === "contactEmail") && <p>{translate("admin.dapp.activity.contactChanged")}</p>}
                </>
            );
        }
        case "rejected":
        case "change_rejected":
        case "removed":
            return recorded.details.reason === undefined ? null : (
                <blockquote className="mx-0 mt-1 mb-0 rounded-[0_8px_8px_0] border-l-[3px] border-l-danger-border bg-canvas px-[14px] py-2.5 text-sm leading-[1.5] whitespace-pre-wrap text-ink-2 wrap-anywhere">
                    {recorded.details.reason}
                </blockquote>
            );
        case "email_sent":
            return (
                <p>
                    {translate("admin.dapp.activity.email", {
                        template: translate(`admin.dapp.activity.emails.${recorded.details.template}`),
                    })}
                </p>
            );
        case "email_failed":
            return (
                <>
                    <p>
                        {translate("admin.dapp.activity.email", {
                            template: translate(`admin.dapp.activity.emails.${recorded.details.template}`),
                        })}
                    </p>
                    <CodeLine label={translate("admin.dapp.activity.errorLabel")} value={recorded.details.error} />
                </>
            );
        case "auth0_failed":
            return (
                <>
                    <p>{translate("admin.dapp.activity.operation", { op: recorded.details.op })}</p>
                    <CodeLine label={translate("admin.dapp.activity.errorLabel")} value={recorded.details.error} />
                    {recorded.details.clientId !== undefined && (
                        <CodeLine label={translate("admin.dapp.activity.clientIdLabel")} value={recorded.details.clientId} />
                    )}
                </>
            );
        case "auth0_deleted":
            return <CodeLine label={translate("admin.dapp.activity.clientIdLabel")} value={recorded.details.clientId} />;
        case "auth0_created":
        case "auth0_updated":
            return (
                <>
                    <CodeLine label={translate("admin.dapp.activity.clientIdLabel")} value={recorded.details.clientId} />
                    <details>
                        <summary>{translate("admin.dapp.activity.values")}</summary>
                        <FieldList rows={payloadRows(recorded.details.payload, translate)} />
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

type ByLineProps = {
    event: DappEventDto;
};

function ByLine({ event: { actorEmail, actorRole } }: ByLineProps): ReactNode {
    const translate = useTranslate();
    if (actorRole === "system") return translate("admin.dapp.activity.bySystem");
    return (
        <>
            {translate("admin.dapp.by")} {actorEmail === null ? translate("admin.dapp.activity.unknown") : <EmailText email={actorEmail} />}{" "}
            ({translate(actorRole === "admin" ? "admin.dapp.activity.roles.admin" : "admin.dapp.activity.roles.owner")})
        </>
    );
}

export type ActivityLogProps = {
    id: string;
};

export function ActivityLog({ id }: ActivityLogProps): React.JSX.Element {
    const translate = useTranslate();
    const events = useGetDappEvents(id);
    const errorMessage = useErrorMessage(events.error);

    return (
        <Card className="overflow-hidden" aria-labelledby="activity-heading">
            <CardHeader variant="split">
                <h2 id="activity-heading">{translate("admin.dapp.activity.title")}</h2>
                {events.data && (
                    <span className="text-sm text-ink-subtle">{translate("admin.dapp.activity.count", { count: events.data.length })}</span>
                )}
            </CardHeader>
            {events.error && events.data !== undefined && (
                <CardBody>
                    <RefreshError error={events.error} />
                </CardBody>
            )}
            {events.isPending ? (
                <CardBody role="status">
                    <Spinner />
                    <span className="sr-only">{translate("admin.dapp.activity.loading")}</span>
                </CardBody>
            ) : events.data === undefined ? (
                <CardBody>
                    <Callout tone="error" title={translate("admin.dapp.activity.loadError")}>
                        <p>{errorMessage}</p>
                    </Callout>
                </CardBody>
            ) : events.data.length === 0 ? (
                <CardBody as="p" className="text-ink-subtle">
                    {translate("admin.dapp.activity.empty")}
                </CardBody>
            ) : (
                <ol className="m-0 flex list-none flex-col px-6 pt-1 pb-2">
                    {events.data.map((event) => (
                        <li key={event.id} className="flex gap-3.5 border-b border-b-border py-[14px] last:border-b-0">
                            <span
                                className={`flex size-8 flex-none items-center justify-center rounded-pill text-xs font-bold ${EVENT_TONES[event.type]}`}
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
                                    <strong className="text-base font-semibold">
                                        {translate(`admin.dapp.activity.events.${event.type}`)}
                                    </strong>
                                    <span>
                                        <ByLine event={event} />
                                    </span>
                                    <time dateTime={event.createdAt} className="text-xs whitespace-nowrap text-ink-subtle">
                                        {formatDateTime(event.createdAt)}
                                    </time>
                                </p>
                                <div className="grid gap-2 text-sm text-ink-3 empty:hidden [&_dl]:rounded-lg [&_dl]:border [&_dl]:border-border [&_dl]:shadow-card [&_summary]:cursor-pointer [&_summary]:text-ink-subtle">
                                    <EventDetails event={event} />
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}
