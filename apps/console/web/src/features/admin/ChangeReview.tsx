import type { AdminDapp, SyncedFields } from "../../api/client";
import { diffSyncedFields } from "../../lib/dapp-fields";
import { formatDateTime } from "../../lib/format";
import { Button } from "../../ui/Button";
import { CheckIcon } from "../../ui/icons";
import { ChangeDiff } from "../dapp/ChangeDiff";
import styles from "./admin.module.css";

type ChangeReviewProps = {
    dapp: AdminDapp;
    change: SyncedFields;
    onApprove: () => void;
    onReject: () => void;
};

export function ChangeReview({ dapp, change, onApprove, onReject }: ChangeReviewProps) {
    return (
        <section className={`${styles.card} ${styles.reviewCard}`} aria-labelledby="change-heading">
            <div className={styles.cardHead}>
                <h2 id="change-heading">Change under review</h2>
                {dapp.pendingChangeAt && <span className={styles.cardMeta}>Requested {formatDateTime(dapp.pendingChangeAt)}</span>}
            </div>
            <div className={styles.cardBody}>
                <ChangeDiff rows={diffSyncedFields(dapp, change)} beforeLabel="Live" afterLabel="Proposed" />
                {change.logoUrl !== dapp.logoUrl && (
                    <figure className={styles.logoFigure}>
                        <span className={styles.logoBox}>
                            <img src={change.logoUrl} alt={`Proposed logo of ${change.name}`} />
                        </span>
                        <figcaption>Proposed logo</figcaption>
                    </figure>
                )}
                <div className={styles.cardActions}>
                    <Button onClick={onApprove}>
                        <CheckIcon size={16} />
                        Approve change
                    </Button>
                    <Button variant="danger" onClick={onReject}>
                        Reject change
                    </Button>
                </div>
            </div>
        </section>
    );
}
