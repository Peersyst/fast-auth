import type { DappFormFields } from "../../api/client";
import { FIELD_LABELS, MAU_LABELS } from "../../lib/dapp-fields";
import { initials } from "../../lib/initials";
import { Button } from "../../ui/Button";
import { PencilIcon } from "../../ui/icons";
import styles from "./dapp.module.css";
import { FieldList, Value } from "./FieldValues";

export function DappSummary({ dapp, onEdit }: { dapp: DappFormFields; onEdit: () => void }) {
    return (
        <article className={styles.summary}>
            <div className={styles.summaryHeader}>
                <span className={styles.avatar} aria-hidden="true">
                    {initials(dapp.name)}
                </span>
                <div className={styles.summaryTitle}>
                    <h2>{dapp.name}</h2>
                    {dapp.description && <p>{dapp.description}</p>}
                </div>
                <Button variant="secondary" onClick={onEdit}>
                    <PencilIcon />
                    Edit
                </Button>
            </div>
            <FieldList
                rows={[
                    [FIELD_LABELS.mauBracket, MAU_LABELS[dapp.mauBracket]],
                    [FIELD_LABELS.logoUrl, <Value key="logoUrl" value={dapp.logoUrl} code />],
                    [FIELD_LABELS.callbackUrls, <Value key="callbackUrls" value={dapp.callbackUrls} code />],
                    [FIELD_LABELS.logoutUrls, <Value key="logoutUrls" value={dapp.logoutUrls} code />],
                    [FIELD_LABELS.webOrigins, <Value key="webOrigins" value={dapp.webOrigins} code />],
                    [FIELD_LABELS.contactEmail, dapp.contactEmail],
                ]}
            />
        </article>
    );
}
