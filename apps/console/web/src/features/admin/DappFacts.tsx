import type { ReactNode } from "react";
import type { AdminDapp } from "../../api/client";
import { FIELD_LABELS, MAU_LABELS } from "../../lib/dapp-fields";
import { formatDateTime } from "../../lib/format";
import { Button } from "../../ui/Button";
import { CopyButton } from "../../ui/CopyButton";
import { InfoIcon } from "../../ui/icons";
import { FieldList, Value, type FieldRow } from "../dapp/FieldValues";
import valueStyles from "../dapp/values.module.css";
import styles from "./admin.module.css";
import { EmailLink, EmailText } from "./Email";

const SIDE_FACTS = { list: styles.sideFacts };

function FactCard({ title, action, facts }: { title: string; action?: ReactNode; facts: FieldRow[] }) {
    return (
        <section className={styles.card}>
            <div className={styles.cardHead}>
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
                        <div key="logo" className={styles.logoCell}>
                            <span className={styles.logoBox}>
                                <img src={dapp.logoUrl} alt={`Logo of ${dapp.name}`} />
                            </span>
                            <code className={valueStyles.code}>{dapp.logoUrl}</code>
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
                            <span className={styles.note}>· to reach the team; the console emails the owner</span>
                        </>,
                    ],
                    [
                        "Owner",
                        <>
                            <EmailLink email={dapp.ownerEmail} />{" "}
                            <span className={styles.note}>· owns this dApp and receives its emails</span>
                        </>,
                    ],
                ]}
            />
        </>
    );
}

export function DappRecord({ dapp }: { dapp: AdminDapp }) {
    const when = (iso: string | null) => (iso ? formatDateTime(iso) : "Never");
    const none = <span className={valueStyles.none}>None</span>;
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
                          <span key="clientId" className={styles.clientId}>
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
            <section className={styles.sideCard}>
                <h2>Provisioning</h2>
                {!dapp.auth0ClientId && dapp.status === "pending" && (
                    <div className={styles.infoBox}>
                        <InfoIcon size={18} />
                        <span>
                            No Auth0 application yet. Approving creates one from these details and emails the client ID to {dapp.ownerEmail}
                            .
                        </span>
                    </div>
                )}
                <FieldList classes={SIDE_FACTS} rows={provisioning} />
            </section>
            <section className={styles.sideCard}>
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
