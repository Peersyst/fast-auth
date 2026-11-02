import type { ReactNode } from "react";
import { FIELD_LABELS, MAU_LABELS } from "@shared/console-domain/dapp";
import type { AdminDapp } from "../../api/client";
import { formatDateTime } from "../../lib/format";
import { Button } from "../../ui/Button";
import { CopyButton } from "../../ui/CopyButton";
import { InfoIcon } from "../../ui/icons";
import { FieldList, Value, valueClasses, type FieldRow } from "../dapp/FieldValues";
import { adminClasses } from "./classes";
import { EmailLink, EmailText } from "./Email";

const SIDE_CARD =
    "flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-card [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:tracking-[normal]";
const SIDE_FACTS = {
    list: "m-0 flex flex-col gap-2 text-sm [&_code]:font-mono [&_code]:text-xs [&_dd]:m-0 [&_dd]:ml-auto [&_dd]:min-w-0 [&_dd]:text-right [&_dd]:wrap-anywhere [&_dt]:font-mono [&_dt]:text-[11px] [&_dt]:font-medium [&_dt]:tracking-kicker [&_dt]:text-ink-subtle [&_dt]:uppercase [&>div]:flex [&>div]:flex-wrap [&>div]:items-baseline [&>div]:justify-between [&>div]:gap-x-3 [&>div]:gap-y-1",
};

function FactCard({ title, action, facts }: { title: string; action?: ReactNode; facts: FieldRow[] }) {
    return (
        <section className={adminClasses.card}>
            <div className={adminClasses.cardHead}>
                <h2>{title}</h2>
                {action}
            </div>
            <FieldList rows={facts} />
        </section>
    );
}

type DappFactsProps = {
    dapp: AdminDapp;
    onChangeOwner?: () => void;
};

export function DappFacts({ dapp, onChangeOwner }: DappFactsProps) {
    return (
        <>
            <FactCard
                title="Application"
                facts={[
                    [FIELD_LABELS.name, <Value key="name" value={dapp.name} />],
                    [FIELD_LABELS.description, <Value key="description" value={dapp.description} />],
                    [
                        FIELD_LABELS.logoUrl,
                        <div key="logo" className="flex min-w-0 items-center gap-3">
                            <span className={adminClasses.logoBox}>
                                <img src={dapp.logoUrl} alt={`Logo of ${dapp.name}`} />
                            </span>
                            <code className={valueClasses.code}>{dapp.logoUrl}</code>
                        </div>,
                    ],
                    [FIELD_LABELS.mauBracket, MAU_LABELS[dapp.mauBracket]],
                ]}
            />
            <FactCard
                title="Whitelisted URLs"
                facts={[
                    [FIELD_LABELS.callbackUrls, <Value key="callbackUrls" value={dapp.callbackUrls} code />],
                    [FIELD_LABELS.logoutUrls, <Value key="logoutUrls" value={dapp.logoutUrls} code />],
                    [FIELD_LABELS.webOrigins, <Value key="webOrigins" value={dapp.webOrigins} code />],
                ]}
            />
            <FactCard
                title="Contact"
                action={
                    onChangeOwner && (
                        <Button variant="secondary" size="small" onClick={onChangeOwner}>
                            Change owner
                        </Button>
                    )
                }
                facts={[
                    [
                        "Primary contact",
                        <>
                            <EmailLink email={dapp.contactEmail} />{" "}
                            <span className="text-sm text-ink-subtle">· to reach the team; the console emails the owner</span>
                        </>,
                    ],
                    [
                        "Owner",
                        <>
                            <EmailLink email={dapp.ownerEmail} />{" "}
                            <span className="text-sm text-ink-subtle">· owns this dApp and receives its emails</span>
                        </>,
                    ],
                ]}
            />
        </>
    );
}

export function DappRecord({ dapp }: { dapp: AdminDapp }) {
    const when = (iso: string | null) => (iso ? formatDateTime(iso) : "Never");
    const none = <span className={valueClasses.none}>None</span>;
    const provisioning: FieldRow[] =
        dapp.status === "removed"
            ? [
                  ["Former client ID", dapp.auth0ClientId ? <code key="clientId">{dapp.auth0ClientId}</code> : none],
                  ...(dapp.auth0ClientId && !dapp.auth0Error ? [["Deleted from Auth0", when(dapp.auth0SyncedAt)] satisfies FieldRow] : []),
              ]
            : [
                  [
                      "Client ID",
                      dapp.auth0ClientId ? (
                          <span key="clientId" className="inline-flex flex-wrap items-center justify-end gap-2">
                              <code>{dapp.auth0ClientId}</code>
                              <CopyButton value={dapp.auth0ClientId} label="Copy client ID" />
                          </span>
                      ) : (
                          none
                      ),
                  ],
                  ["Synced to Auth0", when(dapp.auth0SyncedAt)],
              ];
    const reviewed = dapp.reviewedAt ? (
        <>
            {formatDateTime(dapp.reviewedAt)} by {dapp.reviewedBy === null ? "auto-approval" : <EmailText email={dapp.reviewedBy} />}
        </>
    ) : (
        "Not yet"
    );
    return (
        <>
            <section className={SIDE_CARD}>
                <h2>Provisioning</h2>
                {!dapp.auth0ClientId && dapp.status === "pending" && (
                    <div className="flex gap-2.5 rounded-[10px] bg-canvas p-3 text-sm leading-[1.5] text-ink-3 [&_svg]:mt-px [&_svg]:flex-none">
                        <InfoIcon size={18} />
                        <span>
                            No Auth0 application yet. Approving creates one from these details and emails the client ID to {dapp.ownerEmail}
                            .
                        </span>
                    </div>
                )}
                <FieldList classes={SIDE_FACTS} rows={provisioning} />
            </section>
            <section className={SIDE_CARD}>
                <h2>Record</h2>
                <FieldList
                    classes={SIDE_FACTS}
                    rows={[
                        ["Reviewed", reviewed],
                        ["Created", formatDateTime(dapp.createdAt)],
                        ["Updated", formatDateTime(dapp.updatedAt)],
                        ["ID", <code key="id">{dapp.id}</code>],
                    ]}
                />
            </section>
        </>
    );
}
