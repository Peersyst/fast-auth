import { diffSyncedFields } from "@shared/console-domain/dapp-edits";
import type { AdminDapp, SyncedFields } from "../../api/client";
import { cn } from "../../lib/cn";
import { formatDateTime } from "../../lib/format";
import { Button } from "../../ui/Button";
import { CheckIcon } from "../../ui/icons";
import { ChangeDiff } from "../dapp/ChangeDiff";
import { adminClasses } from "./classes";

type ChangeReviewProps = {
    dapp: AdminDapp;
    change: SyncedFields;
    onApprove: () => void;
    onReject: () => void;
};

export function ChangeReview({ dapp, change, onApprove, onReject }: ChangeReviewProps) {
    return (
        <section className={cn(adminClasses.card, "border-warning-border")} aria-labelledby="change-heading">
            <div className={adminClasses.cardHead}>
                <h2 id="change-heading">Change under review</h2>
                {dapp.pendingChangeAt && <span className={adminClasses.cardMeta}>Requested {formatDateTime(dapp.pendingChangeAt)}</span>}
            </div>
            <div className={adminClasses.cardBody}>
                <ChangeDiff rows={diffSyncedFields(dapp, change)} beforeLabel="Live" afterLabel="Proposed" />
                {change.logoUrl !== dapp.logoUrl && (
                    <figure className="m-0 flex items-center gap-3 text-sm text-ink-subtle">
                        <span className={adminClasses.logoBox}>
                            <img src={change.logoUrl} alt={`Proposed logo of ${change.name}`} />
                        </span>
                        <figcaption>Proposed logo</figcaption>
                    </figure>
                )}
                <div className="flex flex-wrap gap-2">
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
